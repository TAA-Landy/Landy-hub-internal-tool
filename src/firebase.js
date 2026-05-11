import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA57mh160VsT0aG-bjwV5tYXJIVUHB2Gmo",
  authDomain: "landy-ticket.firebaseapp.com",
  projectId: "landy-ticket",
  storageBucket: "landy-ticket.firebasestorage.app",
  messagingSenderId: "785805744603",
  appId: "1:785805744603:web:113973cff6b1fbacdbeffe",
  measurementId: "G-BCLQQ47MGF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
