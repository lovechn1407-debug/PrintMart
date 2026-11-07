import * as admin from "firebase-admin";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "printmart-bd9da";
const databaseURL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  "https://printmart-bd9da-default-rtdb.firebaseio.com";

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL,
        projectId,
      });
    } else {
      admin.initializeApp({
        databaseURL,
        projectId,
      });
    }
  } catch (err) {
    console.warn("Firebase Admin initialize fallback:", err);
  }
}

export const adminDb = admin.database();
export const adminAuth = admin.auth();
export default admin;

