import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export type NotificationType = "grade" | "message" | "system";

export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  link: string;
}

export async function createNotification(
  db: Firestore,
  userId: string,
  data: NotificationData,
) {
  return addDoc(collection(db, "users", userId, "notifications"), {
    ...data,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}
