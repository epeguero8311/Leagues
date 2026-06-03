import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCgQSUI850Kw-5DjouCeIRghGi3C9tBDTc",
  authDomain: "leagues-533e5.firebaseapp.com",
  projectId: "leagues-533e5",
  storageBucket: "leagues-533e5.firebasestorage.app",
  messagingSenderId: "60774744472",
  appId: "1:60774744472:web:c538fbba041e6711a4abed",
  measurementId: "G-365EG27ZXS"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
