// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // For Firestore
import { getDatabase } from "firebase/database"; // For Realtime DB
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD94SWwZAiJ-wO3EdFyKUd2PxOFRnRS9Jg",
  authDomain: "patient-47a96.firebaseapp.com",
  databaseURL: "https://patient-47a96-default-rtdb.firebaseio.com",
  projectId: "patient-47a96",
  storageBucket: "patient-47a96.firebasestorage.app",
  messagingSenderId: "1080833709367",
  appId: "1:1080833709367:web:7d0c5ce904f6bc0664f6b2",
  measurementId: "G-9LSZ9DGFRZ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);         // Firestore
export const rtdb = getDatabase(app);        // Realtime DB (choose one)
export const storage = getStorage(app);
