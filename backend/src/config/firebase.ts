import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let firebaseAdmin: typeof admin | null = null;

export const getFirebaseAdmin = () => {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(process.cwd(), "src/config/serviceAccountKey.json");

  if (!fs.existsSync(serviceAccountPath)) {
    throw { statusCode: 500, message: "Firebase service account key is missing" };
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  firebaseAdmin = admin;
  return firebaseAdmin;
};
