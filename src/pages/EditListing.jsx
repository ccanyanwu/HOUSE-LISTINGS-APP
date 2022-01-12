import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import {
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase.config";
import { v4 as uuidv4 } from "uuid";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Spinner from "../components/Spinner";

const EditListing = () => {
  const [geolocationEnabled/* , setGeolocationEnabled */] = useState(false),
    [loading, setLoading] = useState(false),
    [listing, setListing] = useState(false),
    [formData, setFormData] = useState({
      type: "rent",
      name: "",
      bedrooms: 1,
      bathrooms: 1,
      parking: false,
      furnished: false,
      address: "",
      offer: false,
      regularPrice: 0,
      discountedPrice: 0,
      images: {},
      latitude: 0,
      longitude: 0,
    });
  const {
    type,
    name,
    bedrooms,
    bathrooms,
    parking,
    furnished,
    address,
    offer,
    regularPrice,
    discountedPrice,
    images,
    latitude,
    longitude,
  } = formData;

  const auth = getAuth(),
    navigate = useNavigate(),
    params = useParams(),
    isMounted = useRef(true);

  //Redirect if not user's
  useEffect(() => {
    if (listing && listing.userRef !== auth.currentUser.uid) {
      toast.error("You cannot edit this");
      navigate("/");
    }
  });

  //Fetches edit
  useEffect(() => {
    setLoading(true);
    const fetchListing = async () => {
      const docRef = doc(db, "listings", params.listingId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setListing(docSnap.data());
        setFormData({ ...docSnap.data(), address: docSnap.data().location });
        setLoading(false);
      } else {
        navigate("/");
        toast.error("Listing does not exist");
      }
    };

    fetchListing();
  }, [navigate, params.listingId]);

  //sets userRef to logged in user
  useEffect(() => {
    if (isMounted) {
      onAuthStateChanged(auth, (user) => {
        if (user) return setFormData({ ...formData, userRef: user.uid });
        navigate("/sign-in");
      });
    }

    return () => (isMounted.current = false);

    // eslint-disable-next-line
  }, [isMounted]);

  const onMutate = (e) => {
    let boolean = null;
    if (e.target.value === "true") {
      boolean = true;
    }
    if (e.target.value === "false") {
      boolean = false;
    }

    //File uploads
    if (e.target.files) {
      setFormData((prevState) => ({
        ...prevState,
        images: e.target.files,
      }));
    }

    //Booleans/Text/Numbers
    if (!e.target.files) {
      setFormData((prevState) => ({
        ...prevState,
        [e.target.id]: boolean ?? e.target.value,
      }));
    }
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (discountedPrice >= regularPrice) {
      setLoading(false);
      toast.error("Discounted price must be less than regular price");
      return;
    }

    if (images.length > 6) {
      setLoading(false);
      toast.error("Maximum of 6 images can be uploaded");
      return;
    }

    //Handling geolocation
    let geolocation = {},
      location;

    if (geolocationEnabled) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.REACT_APP_GEOCODE_KEY}`
      );
      const data = await response.json();
      geolocation.lat = data.results[0]?.geometry.location.lat ?? 0;
      geolocation.lng = data.results[0]?.geometry.location.lng ?? 0;
      location =
        data.status === "ZERO-RESULTS"
          ? undefined
          : data.results[0]?.formatted_address;

      if (location === undefined || location.includes("undefined")) {
        setLoading(false);
        toast.error("Please enter a valid address");
        return;
      }
    } else {
      geolocation.lat = latitude;
      geolocation.lng = longitude;
    }

    //Store image in firebase
    const storeImage = async (image) => {
      return new Promise((resolve, reject) => {
        const storage = getStorage();
        const fileName = `${auth.currentUser.uid}-${image.name}-${uuidv4()}`;
        const storageRef = ref(storage, `images/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, image);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log("Upload is " + progress + "% done");
            switch (snapshot.state) {
              case "paused":
                console.log("Upload is paused");
                break;
              case "running":
                console.log("Upload is running");
                break;
            }
          },
          (error) => {
            reject(error);
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              resolve(downloadURL);
            });
          }
        );
      });
    };

    const imageUrls = await Promise.all(
      [...images].map((image) => storeImage(image))
    ).catch(() => {
      setLoading(false);
      toast.error("Failed to upload Image");
      return;
    });

    const formDataCopy = {
      ...formData,
      imageUrls,
      geolocation,
      timestamp: serverTimestamp(),
    };

    //clean up data
    formDataCopy.location = address;
    delete formDataCopy.images;
    delete formDataCopy.address;
    location && (formDataCopy.location = location);
    !formDataCopy.offer && delete formDataCopy.discountedPrice;

    //save edited listing to database
    const docRef = doc(db, "listings", params.listingId);
    await updateDoc(docRef, formDataCopy);
    setLoading(false);
    toast.success("Listing Saved");
    navigate(`/category/${formDataCopy.type}/${docRef.id}`);
  };

  if (loading) return <Spinner />;
  return (
    <div className="profile">
      <header>
        <p className="pageHeader">Edit Listing</p>
      </header>
      <main>
        <form onSubmit={onSubmit}>
          {/* Sell/Rent */}
          <label className="formLabel">Sell / Rent</label>
          <div className="formButtons">
            <button
              type="button"
              className={type === "sale" ? "formButtonActive" : "formButton"}
              id="type"
              value="sale"
              onClick={onMutate}
            >
              Sell
            </button>
            <button
              type="button"
              className={type === "rent" ? "formButtonActive" : "formButton"}
              id="type"
              value="rent"
              onClick={onMutate}
            >
              Rent
            </button>
          </div>
          {/* Name */}
          <label className="formLabel">Name</label>
          <input
            type="text"
            value={name}
            id="name"
            className="formInputName"
            onChange={onMutate}
            maxLength="32"
            minLength="10"
            required
          />
          {/* Bathrooms & Bathtubs */}
          <div className="formRooms flex">
            <div>
              <label className="formLabel">Bedrooms</label>
              <input
                type="number"
                value={bedrooms}
                id="bedrooms"
                className="formInputSmall"
                onChange={onMutate}
                max="50"
                min="1"
                required
              />
            </div>
            <div>
              <label className="formLabel">Bathrooms</label>
              <input
                type="number"
                value={bathrooms}
                id="bathrooms"
                className="formInputSmall"
                onChange={onMutate}
                max="50"
                min="1"
                required
              />
            </div>
          </div>
          {/* Parking Spot */}
          <label className="formLabel">Parking Spot</label>
          <div className="formButtons">
            <button
              type="button"
              id="parking"
              value={true}
              onClick={onMutate}
              className={parking ? "formButtonActive" : "formButton"}
              min="1"
              max="50"
            >
              Yes
            </button>
            <button
              type="button"
              id="parking"
              value={false}
              onClick={onMutate}
              className={
                !parking && parking !== null ? "formButtonActive" : "formButton"
              }
            >
              No
            </button>
          </div>
          {/* Furnished */}
          <label className="formLabel">Furnished</label>
          <div className="formButtons">
            <button
              type="button"
              id="furnished"
              value={true}
              onClick={onMutate}
              className={furnished ? "formButtonActive" : "formButton"}
            >
              Yes
            </button>
            <button
              type="button"
              id="furnished"
              value={false}
              onClick={onMutate}
              className={
                !furnished && furnished !== null
                  ? "formButtonActive"
                  : "formButton"
              }
            >
              No
            </button>
          </div>
          {/* Address */}
          <label className="formLabel">Address</label>
          <textarea
            type="text"
            id="address"
            value={address}
            onChange={onMutate}
            className="formInputAddress"
            required
          />
          {!geolocationEnabled && (
            <div className="formLatLng flex">
              <div>
                <label className="formLabel">Latitude</label>
                <input
                  type="number"
                  value={latitude}
                  id="latitude"
                  className="formInputSmall"
                  onChange={onMutate}
                  required
                />
              </div>
              <div>
                <label className="formLabel">Longitude</label>
                <input
                  type="number"
                  value={longitude}
                  id="longitude"
                  className="formInputSmall"
                  onChange={onMutate}
                  required
                />
              </div>
            </div>
          )}
          {/* Offers */}
          <label className="formLabel">Offers</label>
          <div className="formButtons">
            <button
              type="button"
              id="offer"
              value={true}
              onClick={onMutate}
              className={offer ? "formButtonActive" : "formButton"}
            >
              Yes
            </button>
            <button
              type="button"
              id="offer"
              value={false}
              onClick={onMutate}
              className={
                !offer && offer !== null ? "formButtonActive" : "formButton"
              }
            >
              No
            </button>
          </div>
          {/* Regular Price */}
          <label className="formLabel">Regular Price</label>
          <div className="formPriceDiv">
            <input
              type="number"
              className="formInputSmall"
              value={regularPrice}
              id="regularPrice"
              onChange={onMutate}
              min="50"
              max="750000000"
              required
            />
            {type === "rent" && <p className="formPriceText">$ /month</p>}
          </div>
          {/* Discounted Price */}
          {offer && (
            <>
              <label className="formLabel">Discounted Price</label>
              <div className="formPriceDiv">
                <input
                  type="number"
                  className="formInputSmall"
                  value={discountedPrice}
                  id="discountedPrice"
                  onChange={onMutate}
                  min="50"
                  max="750000000"
                  required={offer}
                />
              </div>
            </>
          )}
          {/* Image Upload */}
          <label className="formLabel">Images</label>
          <p className="imagesInfo">
            The first image will be the cover (maximum of 6 pages can be
            uploaded)
          </p>
          <input
            type="file"
            className="formInputFile"
            id="images"
            onChange={onMutate}
            max="6"
            accept=".jpg, .jpeg, .png"
            multiple
            required
          />
          <button type="submit" className="primaryButton createListingButton">
            Edit Listing
          </button>
        </form>
      </main>
    </div>
  );
};

export default EditListing;
