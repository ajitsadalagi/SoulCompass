import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAvJIqvoCt-qAEFKuvsJM7SEQH1rqLerBs",
  authDomain: "csanthi-a20cf.firebaseapp.com",
  projectId: "csanthi-a20cf",
  storageBucket: "csanthi-a20cf.firebasestorage.app",
  messagingSenderId: "890775123271",
  appId: "1:890775123271:web:7ad0bcfea18801e372c862",
  measurementId: "G-YMWQXKFHCB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
