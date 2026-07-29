import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase";

const functions = getFunctions(app, "us-central1");
const uploadClientFileCall = httpsCallable(functions, "uploadClientFile", { timeout: 60000 });

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadClientFile(file, clientKey, folder) {
  if (!file) throw new Error("Choose a file to upload.");

  const fileBase64 = await fileToBase64(file);
  const response = await uploadClientFileCall({
    clientKey,
    folder,
    fileName: file.name || "file",
    contentType: file.type || "application/octet-stream",
    fileBase64,
  });

  return response.data;
}
