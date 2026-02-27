import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredKeys = [
  "apiKey",
  "authDomain",
  "databaseURL",
  "projectId",
  "storageBucket",
  "appId",
];

const isConfigured = requiredKeys.every((key) => Boolean(config[key]));
export const missingFirebaseKeys = requiredKeys.filter((key) => !config[key]);

export const firebaseEnabled = isConfigured;

let app;
let realtimeDb;
let storageBucket;

if (isConfigured) {
  app = initializeApp(config);
  realtimeDb = getDatabase(app);
  storageBucket = getStorage(app);
} else {
  app = null;
  realtimeDb = null;
  storageBucket = null;
}

export { app, realtimeDb, storageBucket };
