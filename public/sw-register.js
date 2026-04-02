// FinCalci — SW registration (minimal)
// Registers the nuke SW to clear old caches.
// Keeps PWA install prompt handling.
(function() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js').then(function() {
      // SW registered — if it's the nuke version, it will self-destruct
    }).catch(function() {});

    // Listen for nuke complete → reload once
    navigator.serviceWorker.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'SW_NUKED') {
        location.reload();
      }
    });

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      window.triggerPWAInstall = function() {
        return e.prompt().then(function(r) { return r.outcome === 'accepted'; });
      };
      window.dispatchEvent(new Event('pwa-install-available'));
    });

    window.addEventListener('appinstalled', function() {
      window.dispatchEvent(new Event('pwa-installed'));
    });
  });
})();
