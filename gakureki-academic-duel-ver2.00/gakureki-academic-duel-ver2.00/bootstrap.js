(() => {
  if (location.protocol !== 'file:') return;
  window.addEventListener('DOMContentLoaded', () => {
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:sticky;top:0;z-index:99999;padding:14px 18px;background:#5b1f1f;color:#fff;font:600 14px/1.6 system-ui,sans-serif;border-bottom:1px solid #ffffff44';
    box.textContent = 'このゲームは index.html の直接起動では動きません。ZIPを展開し、START-WINDOWS.bat をダブルクリックしてください。Pythonは不要です。';
    document.body.prepend(box);
  }, { once: true });
})();
