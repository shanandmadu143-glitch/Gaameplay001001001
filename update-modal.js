<!-- New Update Modal (25283.jpg Style) -->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;600;700;800&family=Poppins:wght@500;600;700&display=swap');

  .upd-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 6, 14, 0.84);
    backdrop-filter: blur(8px);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 18px;
    z-index: 9999;
    font-family: 'Noto Sans Sinhala', 'Poppins', sans-serif;
  }
  .upd-modal-backdrop.show {
    display: flex;
  }
  .upd-card {
    width: 100%;
    max-width: 380px;
    background: linear-gradient(160deg, #10172a 0%, #0b1020 100%);
    border: 1.8px solid #f5b942;
    border-radius: 26px;
    padding: 24px 20px 20px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 25px rgba(245, 185, 66, 0.16);
    color: #f8fafc;
    text-align: center;
  }
  .upd-icon-badge {
    width: 62px;
    height: 62px;
    margin: 0 auto 14px;
    border-radius: 50%;
    border: 2px solid #22c55e;
    background: rgba(34, 197, 94, 0.12);
    display: grid;
    place-items: center;
    color: #4ade80;
    font-size: 28px;
  }
  .upd-title {
    font-size: 22px;
    font-weight: 800;
    color: #facc15;
    margin: 0 0 6px;
    font-family: 'Poppins', 'Noto Sans Sinhala', sans-serif;
  }
  .upd-meta {
    font-size: 13px;
    font-weight: 600;
    color: #38bdf8;
    margin-bottom: 14px;
    font-family: 'Poppins', 'Noto Sans Sinhala', sans-serif;
    word-break: break-all;
  }
  .upd-desc-box {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 13.5px;
    line-height: 1.55;
    color: #e2e8f0;
    margin-bottom: 14px;
  }
  .upd-progress-box {
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 18px;
  }
  .upd-status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12.5px;
    font-weight: 700;
    margin-bottom: 8px;
    gap: 8px;
  }
  .upd-status-text {
    color: #f87171;
    text-align: left;
  }
  .upd-status-text.ok {
    color: #4ade80;
  }
  .upd-percent {
    color: #facc15;
    font-family: 'Poppins', sans-serif;
    flex-shrink: 0;
  }
  .upd-bar-track {
    width: 100%;
    height: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .upd-bar-fill {
    height: 100%;
    width: 0%;
    border-radius: 999px;
    background: linear-gradient(90deg, #22c55e 0%, #eab308 75%, #f59e0b 100%);
    transition: width 0.25s ease;
  }
  .upd-sub-row {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: #94a3b8;
    font-family: 'Poppins', sans-serif;
  }
  .upd-actions {
    display: grid;
    grid-template-columns: 1.25fr 1fr;
    gap: 10px;
  }
  .upd-btn-install {
    border: 0;
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: 'Poppins', 'Noto Sans Sinhala', sans-serif;
  }
  .upd-btn-later {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 13.5px;
    font-weight: 700;
    color: #e2e8f0;
    background: rgba(30, 41, 59, 0.85);
    cursor: pointer;
    font-family: 'Noto Sans Sinhala', 'Poppins', sans-serif;
  }
</style>

<div class="upd-modal-backdrop" id="gameUpdateModal" role="dialog" aria-modal="true">
  <div class="upd-card">
    <div class="upd-icon-badge">
      <i class="fa-brands fa-android"></i>
    </div>
    <h2 class="upd-title">New Update</h2>
    <div class="upd-meta" id="updMetaText">Version v0.1 • app-debug.apk (26.07 MB)</div>

    <div class="upd-desc-box" id="updDescText">
      New Update v0.1 is available! Tap Install to update the game.
    </div>

    <div class="upd-progress-box">
      <div class="upd-status-row">
        <span class="upd-status-text ok" id="updStatusLabel">Install කිරීමට සූදානම්.</span>
        <span class="upd-percent" id="updPercentLabel">0%</span>
      </div>
      <div class="upd-bar-track">
        <div class="upd-bar-fill" id="updProgressBar"></div>
      </div>
      <div class="upd-sub-row">
        <span id="updSizeLabel">26.07 MB</span>
        <span id="updChunksLabel">0 / 54 chunks</span>
      </div>
    </div>

    <div class="upd-actions">
      <button type="button" class="upd-btn-install" id="updInstallBtn">
        <i class="fa-solid fa-download"></i>
        <span>Install</span>
      </button>
      <button type="button" class="upd-btn-later" id="updLaterBtn">පසුවට</button>
    </div>
  </div>
</div>

<script>
(function () {
  const DEFAULT_UPDATE = {
    version: 'v0.1',
    fileName: 'app-debug.apk',
    sizeText: '26.07 MB',
    totalChunks: 54,
    apkUrl: '',
    message: 'New Update v0.1 is available! Tap Install to update the game.'
  };

  let currentUpdate = { ...DEFAULT_UPDATE };

  const backdrop = document.getElementById('gameUpdateModal');
  const metaEl = document.getElementById('updMetaText');
  const descEl = document.getElementById('updDescText');
  const statusEl = document.getElementById('updStatusLabel');
  const percentEl = document.getElementById('updPercentLabel');
  const barEl = document.getElementById('updProgressBar');
  const sizeEl = document.getElementById('updSizeLabel');
  const chunksEl = document.getElementById('updChunksLabel');
  const installBtn = document.getElementById('updInstallBtn');
  const laterBtn = document.getElementById('updLaterBtn');

  function setUpdateProgress(percent, chunksDone, statusMsg, isError) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    const total = currentUpdate.totalChunks || 54;
    const done = chunksDone !== undefined ? chunksDone : Math.round((p / 100) * total);

    percentEl.textContent = p + '%';
    barEl.style.width = p + '%';
    chunksEl.textContent = done + ' / ' + total + ' chunks';

    if (statusMsg) {
      statusEl.textContent = statusMsg;
    }
    statusEl.classList.toggle('ok', !isError);
  }

  window.openGameUpdateModal = function (opts = {}) {
    currentUpdate = { ...DEFAULT_UPDATE, ...opts };
    metaEl.textContent = `Version ${currentUpdate.version} • ${currentUpdate.fileName} (${currentUpdate.sizeText})`;
    descEl.textContent = currentUpdate.message;
    sizeEl.textContent = currentUpdate.sizeText;
    setUpdateProgress(0, 0, 'Install කිරීමට සූදානම්.', false);
    installBtn.disabled = false;
    backdrop.classList.add('show');
  };

  window.closeGameUpdateModal = function () {
    backdrop.classList.remove('show');
  };

  // Android පැත්තෙන් progress callbacks එවන්නේ නම්
  window.onApkDownloadProgress = function (percent, chunksDone) {
    setUpdateProgress(percent, chunksDone, 'Download වෙමින් පවතී...', false);
  };

  window.onApkDownloadStatus = function (msg, isError) {
    setUpdateProgress(isError ? 100 : 100, currentUpdate.totalChunks, msg, Boolean(isError));
    installBtn.disabled = false;
  };

  installBtn.addEventListener('click', function () {
    if (!currentUpdate.apkUrl || !/^https?:\/\//i.test(currentUpdate.apkUrl.trim())) {
      setUpdateProgress(100, currentUpdate.totalChunks, 'Install අසාර්ථක විය. APK URL නොමැත.', true);
      return;
    }

    installBtn.disabled = true;
    setUpdateProgress(15, Math.round(0.15 * (currentUpdate.totalChunks || 54)), 'Android Installer වෙත යොමු කරමින්...', false);

    if (window.AndroidApkBridge && typeof window.AndroidApkBridge.installApkFromUrl === 'function') {
      try {
        window.AndroidApkBridge.installApkFromUrl(currentUpdate.apkUrl.trim());
        setTimeout(() => {
          setUpdateProgress(100, currentUpdate.totalChunks, 'Installer ආරම්භ විය.', false);
          installBtn.disabled = false;
        }, 700);
      } catch (err) {
        setUpdateProgress(100, currentUpdate.totalChunks, 'Install අසාර්ථක විය.', true);
        installBtn.disabled = false;
      }
    } else {
      // Browser / non-bridge fallback
      window.open(currentUpdate.apkUrl.trim(), '_blank', 'noopener,noreferrer');
      setUpdateProgress(100, currentUpdate.totalChunks, 'Browser හරහා Download ආරම්භ විය.', false);
      installBtn.disabled = false;
    }
  });

  laterBtn.addEventListener('click', function () {
    window.closeGameUpdateModal();
  });
})();
</script>
