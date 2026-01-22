import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - Connected to BOS (GPECX_FLOW)
// Project: comexs-r1g97
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAhn85m2KDDeIZE51uHem5MHM0VwoNlWaU",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "comexs-r1g97.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "comexs-r1g97",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "comexs-r1g97.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1083099377370",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1083099377370:web:abd9647fbd14f75ea4bfe3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
