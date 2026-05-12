// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
const firebaseConfig = {
  apiKey: "AIzaSyCh5mbuxSJjimz7pFOnj1cx9IVpAQj4dRo",
  authDomain: "quickclean-808d9.firebaseapp.com",
  projectId: "quickclean-808d9",
  storageBucket: "quickclean-808d9.firebasestorage.app",
  messagingSenderId: "440258467095",
  appId: "1:440258467095:web:242a4526c344a03bcc9352",
  measurementId: "G-B217Z9KJLT"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
