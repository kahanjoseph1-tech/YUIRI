import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const projectId =
  process.env.FB_ADMIN_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT;

const clientEmail =
  process.env.FB_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;

const privateKey = (
  process.env.FB_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY || ""
).replace(/\\n/g, "\n");

if (getApps().length === 0) {
  const runningOnGoogle =
    Boolean(process.env.K_SERVICE) ||
    Boolean(process.env.FUNCTION_TARGET) ||
    Boolean(process.env.FUNCTIONS_TARGET);

  if (runningOnGoogle) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  } else if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
