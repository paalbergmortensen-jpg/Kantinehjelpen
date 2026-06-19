import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json' assert { type: "json" };

export function getAdminDb() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable.");
  }
  
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Check if app is already initialized
    try {
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: firebaseConfig.projectId
      });
      const db = getFirestore(app);

      return db;
    } catch (e: any) {
      if (e.code === 'app/duplicate-app') {
        const { getApp } = require('firebase-admin/app');
        return getFirestore(getApp());
      }
      throw e;
    }
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT or initialize admin", err);
    throw err;
  }
}

