function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => {
      console.log('Service Worker terdaftar');
    }).catch((error) => {
      console.error('Gagal mendaftar service worker', error);
    });
  }
}

async function requestPushPermission() {
  if (!('Notification' in window)) return;
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    console.log('Notifikasi push diizinkan');
  }
}

window.addEventListener('load', () => {
  registerServiceWorker();
  requestPushPermission();
});
