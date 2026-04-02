// FinCalci — SW registration (minimal)
// Registers clean-slate SW to clear old caches. No update banners, no reloads.
(function() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js').catch(function() {});

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
