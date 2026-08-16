import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBI1vVsd4qh4a7LQ1I_YScTH_GJRW-uKxk",
  authDomain: "gymtracker-e966e.firebaseapp.com",
  projectId: "gymtracker-e966e",
  storageBucket: "gymtracker-e966e.firebasestorage.app",
  messagingSenderId: "832930590266",
  appId: "1:832930590266:web:ae3aa87beba773c2800f03",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
