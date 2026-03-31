// FinCalci — Service Worker registration + safe update with user confirmation
// No native confirm() — uses inline banner state change instead.
//
// Flow:
//   1. Banner: "New version available!" [Update now] [Later]
//   2. User taps "Update now" → banner changes to confirmation
//   3. Banner: "This will reload the app. Your data will be saved." [Reload now] [Cancel]
//   4. User taps "Reload now" → flush saves → skip-waiting → reload
(function() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js').then(function(reg) {
      if (reg.waiting) showUpdateBanner();

      reg.addEventListener('updatefound', function() {
        var newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', function() {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    }).catch(function() {});

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

  function showUpdateBanner() {
    var banner = document.getElementById('sw-update-banner');
    if (banner) banner.style.display = 'block';
    resetBanner();
  }

  function hideBanner() {
    var banner = document.getElementById('sw-update-banner');
    if (banner) banner.style.display = 'none';
    resetBanner();
  }

  function resetBanner() {
    var msg = document.getElementById('sw-update-msg');
    var btnUpdate = document.getElementById('sw-update-btn');
    var btnLater = document.getElementById('sw-update-later');
    var btnConfirm = document.getElementById('sw-update-confirm');
    var btnCancel = document.getElementById('sw-update-cancel');
    if (msg) msg.textContent = 'New version available!';
    if (btnUpdate) btnUpdate.style.display = '';
    if (btnLater) btnLater.style.display = '';
    if (btnConfirm) btnConfirm.style.display = 'none';
    if (btnCancel) btnCancel.style.display = 'none';
  }

  function showConfirmation() {
    var msg = document.getElementById('sw-update-msg');
    var btnUpdate = document.getElementById('sw-update-btn');
    var btnLater = document.getElementById('sw-update-later');
    var btnConfirm = document.getElementById('sw-update-confirm');
    var btnCancel = document.getElementById('sw-update-cancel');
    if (msg) msg.textContent = 'App will reload. Your data will be saved.';
    if (btnUpdate) btnUpdate.style.display = 'none';
    if (btnLater) btnLater.style.display = 'none';
    if (btnConfirm) btnConfirm.style.display = '';
    if (btnCancel) btnCancel.style.display = '';
  }

  function flushPendingSaves() {
    window.dispatchEvent(new Event('fincalci-flush-saves'));
    return new Promise(function(resolve) { setTimeout(resolve, 100); });
  }

  function doReload() {
    var btn = document.getElementById('sw-update-confirm');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    flushPendingSaves().then(function() {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('skip-waiting');
      }

      var reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function() {
        if (!reloaded) { reloaded = true; location.reload(); }
      });

      setTimeout(function() {
        if (!reloaded) { reloaded = true; location.reload(); }
      }, 3000);
    });
  }

  document.addEventListener('click', function(e) {
    if (!e.target) return;

    // Step 1: "Update now" → show confirmation
    if (e.target.id === 'sw-update-btn') {
      showConfirmation();
    }

    // Step 2: "Reload now" → flush + reload
    if (e.target.id === 'sw-update-confirm') {
      doReload();
    }

    // Cancel → back to original banner
    if (e.target.id === 'sw-update-cancel') {
      resetBanner();
    }

    // Later → dismiss entirely
    if (e.target.id === 'sw-update-later') {
      hideBanner();
    }
  });
})();
