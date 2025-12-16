// src/serviceWorker.ts
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/service-worker.js')
                .then(() => console.log('Service Worker registered'))
                .catch((err) => console.error('Service Worker registration failed:', err));
        });
    }
}
