
import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore | null = null;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    console.warn(`
      Firebase Admin SDK is not configured. 
      Database operations (save, get, delete) will be skipped.
      Please set the FIREBASE_SERVICE_ACCOUNT_JSON environment variable.
    `);
  } else {
    if (admin.apps.length === 0) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    db = admin.firestore();
  }
} catch (error: any) {
  console.error('Firebase Admin SDK initialization error:', error.message);
  // db remains null if initialization fails
}

export { db };
