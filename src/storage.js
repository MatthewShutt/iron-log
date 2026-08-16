import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Shared data (splits, logs, bodyweight) is stored in Firestore so it syncs
// between every phone that opens the site. Personal data (which person this
// device belongs to) stays local to that device.
const COLLECTION = "iron-log";

export async function storageGet(key, fallback, shared) {
  if (!shared) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  try {
    const snap = await getDoc(doc(db, COLLECTION, key));
    if (!snap.exists()) return fallback;
    return snap.data().value;
  } catch (e) {
    console.error("firestore get failed", key, e);
    return fallback;
  }
}

export async function storageSet(key, value, shared) {
  if (!shared) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("localStorage set failed", key, e);
    }
    return;
  }
  try {
    await setDoc(doc(db, COLLECTION, key), { value });
  } catch (e) {
    console.error("firestore set failed", key, e);
  }
}
