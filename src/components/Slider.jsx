import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase.config";
import SwiperCore, { Navigation, A11y, Pagination, Scrollbar } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";
import Spinner from "./Spinner";
SwiperCore.use([Navigation, Pagination, A11y, Scrollbar]);

const Slider = () => {
  const [loading, setLoading] = useState(true),
    [listings, setListings] = useState(null),
    navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      const listingsRef = collection(db, "listings");
      const q = query(listingsRef, orderBy("timestamp", "desc", limit(6)));
      const querySnapshot = await getDocs(q);

      let listings = [];
      querySnapshot.forEach((doc) => {
        return listings.push({
          id: doc.id,
          data: doc.data(),
        });
      });
      setListings(listings);
      setLoading(false);
    };

    fetchListings();
  }, []);

  if (loading) return <Spinner />;
  if (listings.length === 0) return <></>
  return (
    listings && (
      <>
        <p className="exploreHeading">Recommended</p>
        <Swiper slidesPerView={1} pagination={{ clickable: true }}>
          {listings.map(({ data, id }) => (
            <SwiperSlide
              key={id}
              onClick={() => navigate(`/category/${data.type}/${id}`)}
            >
              {" "}
              <div
                className="swiperSlideDiv"
                style={{
                  backgroundSize: "cover",
                  background: `url(${data.imageUrls[0]}) center no-repeat`,
                }}
              >
                <p className="swiperSlideText">{data.name}</p>
                <p className="swiperSlidePrice">
                  $
                  {data.discountedPrice
                    .toString()
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ",") ??
                    data.regularPrice
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  {' '} {data.type === 'rent' && '/month'}
                </p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </>
    )
  );
};

export default Slider;
