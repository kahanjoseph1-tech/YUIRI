import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const serviceAccountBase64 = process.env.FB_ADMIN_SERVICE_ACCOUNT_B64;

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

let defaultApp = getApps().find((app) => app.name === "[DEFAULT]");

if (!defaultApp) {
  if (serviceAccountBase64) {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountBase64, "base64").toString("utf-8")
    );

    defaultApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
  } else if (projectId && clientEmail && privateKey) {
    defaultApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } else {
    defaultApp = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }
}

export const adminDb = getFirestore(defaultApp);
export const adminAuth = getAuth(defaultApp);
