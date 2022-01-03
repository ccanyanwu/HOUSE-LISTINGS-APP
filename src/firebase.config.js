// Import the functions you need from the SDKs you need
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDIRm5LUqLQRUyCOEebydtLyV8oez053vQ",
  authDomain: "house-listing-app-fd6ac.firebaseapp.com",
  projectId: "house-listing-app-fd6ac",
  storageBucket: "house-listing-app-fd6ac.appspot.com",
  messagingSenderId: "187097556244",
  appId: "1:187097556244:web:edb066834bc4ece25d4e01",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore();
