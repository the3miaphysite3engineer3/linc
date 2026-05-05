import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD1_qSx7UJgQ1OUT1zkYX8s9fm5q_F6LLg",
  authDomain: "churchmeeting.firebaseapp.com",
  projectId: "churchmeeting",
  storageBucket: "churchmeeting.firebasestorage.app",
  messagingSenderId: "403483609083",
  appId: "1:403483609083:web:d16933f3e9e0240038ad5e",
  measurementId: "G-JNBPCPX3QP"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const db = getFirestore(app);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, provider);