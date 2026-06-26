// auth.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA1N0VP1w4R8cMj4sOR7_-EWEybR1SThgA",
  authDomain: "sinup-626bd.firebaseapp.com",
  projectId: "sinup-626bd",
  storageBucket: "sinup-626bd.firebasestorage.app",
  messagingSenderId: "600624155042",
  appId: "1:600624155042:web:492196cf636df2b21acafb",
  measurementId: "G-89HFP58ELP"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

// Các hàm xuất ra để dùng trong file login.html
export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const registerUser = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
export const logoutUser = () => signOut(auth);