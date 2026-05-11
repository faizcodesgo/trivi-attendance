self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  console.log("SW Active");
});

self.addEventListener("push", event => {

  const data = event.data.json();

  self.registration.showNotification(
    data.title,
    {
      body: data.body,
      icon: "/logo.jpeg"
    }
  );

});