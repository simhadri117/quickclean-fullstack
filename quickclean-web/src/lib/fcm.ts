import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// Get FCM Token for the current user device
export const requestForToken = async (userId: string) => {
  try {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const messaging = getMessaging(app);
      const currentToken = await getToken(messaging, { 
        vapidKey: "YOUR_VAPID_KEY_HERE" // Needs to be replaced with actual VAPID key from Firebase Console -> Cloud Messaging -> Web Push certs
      });
      
      if (currentToken) {
        console.log("FCM Token generated:", currentToken);
        // Save to user profile so backend can send targeted push notifications
        await updateDoc(doc(db, "users", userId), {
          fcmToken: currentToken
        });
        return currentToken;
      } else {
        console.log("No registration token available.");
      }
    }
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
  }
  return null;
};

// Listen to incoming messages when app is in foreground
export const onMessageListener = () => {
  return new Promise((resolve) => {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log("Message received in foreground: ", payload);
      resolve(payload);
    });
  });
};
