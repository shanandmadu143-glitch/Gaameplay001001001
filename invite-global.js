/* global firebase */
(function () {
  'use strict';

  const INVITE_MAX_AGE_MS = 300000;
  const PENDING_ROOM_KEY = 'sinhala_draughts_pending_room';
  const ACTIVE_ROOM_KEY = 'sinhala_draughts_multi_room';
  const BET_KEY = 'sinhala_draughts_bet';

  const DEFAULT_FB_CONFIG = {
    apiKey: 'AIzaSyBnGTuZKekAWA4vBUgfzZZ2CeO8wyR1HaI',
    authDomain: 'bin-card-42614.firebaseapp.com',
    databaseURL: 'https://bin-card-42614-default-rtdb.firebaseio.com',
    projectId: 'bin-card-42614',
    storageBucket: 'bin-card-42614.firebasestorage.app',
    messagingSenderId: '1063550230753',
    appId: '1:1063550230753:web:1ad8306405e709ac5b17a0'
  };

  let auth, db, fbUser;
  let myName = 'ක්‍රීඩකයා';
  let invitesRef = null;
  let hostRoomRef = null;
  let activeInvite = null;
  let isRedirecting = false;
  const notifiedIds = new Set();
  const dismissedIds = new Set();

  function isOnArenaPage() {
    const p = (window.location.pathname || '').toLowerCase();
    return p.endsWith('/arena.html') || p.endsWith('arena.html');
  }

  function injectStylesAndBanner() {
    if (isOnArenaPage()) return;
    if (document.getElementById('globalInviteStyles')) return;

    const style = document.createElement('style');
    style.id = 'globalInviteStyles';
    style.textContent = `
      .sd-global-invite-banner{
        position:fixed;top:14px;left:50%;transform:translate(-50%,-180%);
        width:min(94%,440px);background:linear-gradient(135deg,#18223d,#0c1222);
        border:2px solid #ffd166;border-radius:20px;padding:14px 16px;
        z-index:9999;box-shadow:0 16px 38px rgba(0,0,0,0.85);
        transition:transform 0.25s ease;display:flex;flex-direction:column;gap:10px;
        color:#f8f9fa;font-family:'Gemunu Libre','Poppins',sans-serif;
      }
      .sd-global-invite-banner.show{transform:translate(-50%,0);}
      .sd-global-invite-title{color:#ffd166;font-size:1.05rem;font-weight:800;display:flex;align-items:center;gap:8px;}
      .sd-global-invite-msg{font-size:0.88rem;color:#f1f5f9;line-height:1.4;}
      .sd-global-invite-actions{display:flex;gap:8px;justify-content:flex-end;}
      .sd-inv-btn{border:0;border-radius:12px;padding:8px 14px;font-weight:800;font-size:0.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
      .sd-inv-accept{background:linear-gradient(135deg,#2ecc71,#20b863);color:#09170e;}
      .sd-inv-decline{background:linear-gradient(135deg,#ff4757,#c0392b);color:#fff;}
    `;
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.id = 'sdGlobalInviteBanner';
    banner.className = 'sd-global-invite-banner';
    banner.innerHTML = `
      <div class="sd-global-invite-title"><i class="fa-solid fa-gamepad"></i> Multiplayer Game Invite!</div>
      <div class="sd-global-invite-msg" id="sdGlobalInviteMsg">ක්‍රීඩකයෙකු ඔබට තරඟයකට ආරාධනා කර ඇත.</div>
      <div class="sd-global-invite-actions">
        <button type="button" class="sd-inv-btn sd-inv-accept" id="sdGlobalAcceptBtn"><i class="fa-solid fa-check"></i> Accept & Play</button>
        <button type="button" class="sd-inv-btn sd-inv-decline" id="sdGlobalDeclineBtn"><i class="fa-solid fa-xmark"></i> Decline</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('sdGlobalAcceptBtn').onclick = acceptCurrentInvite;
    document.getElementById('sdGlobalDeclineBtn').onclick = declineCurrentInvite;
  }

  function navigateToArena(roomId, roomBet, role, roomData) {
    if (isRedirecting || isOnArenaPage()) return;
    isRedirecting = true;
    sessionStorage.removeItem(PENDING_ROOM_KEY);

    const safeBet = Math.max(10, Number(roomBet) || Number(sessionStorage.getItem(BET_KEY)) || 50);
    sessionStorage.setItem(BET_KEY, String(safeBet));
    sessionStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify({
      roomId: roomId || '',
      bet: safeBet,
      role: role || 'player',
      uid: fbUser ? fbUser.uid : null,
      hostUid: roomData && roomData.hostUid ? roomData.hostUid : null,
      guestUid: roomData && roomData.guestUid ? roomData.guestUid : null,
      hostName: roomData && roomData.hostName ? roomData.hostName : null,
      guestName: roomData && roomData.guestName ? roomData.guestName : null,
      startedAt: Date.now()
    }));

    const query = new URLSearchParams({
      mode: 'multi',
      bet: String(safeBet),
      roomId: String(roomId || ''),
      role: String(role || 'player')
    }).toString();

    window.location.replace(`arena.html?${query}`);
  }

  async function showSystemNotification(title, body, url) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          vibrate: [200, 100, 200],
          tag: 'sinhala-draughts-invite',
          renotify: true,
          data: { url }
        });
        return;
      }
      new Notification(title, { body });
    } catch (_) {
      try { new Notification(title, { body }); } catch (__) {}
    }
  }

  function showInviteCard(inviteId, inv) {
    if (isOnArenaPage() || dismissedIds.has(inviteId)) return;
    injectStylesAndBanner();

    activeInvite = { inviteId, ...inv };
    const fromName = inv.fromName || 'ක්‍රීඩකයෙකු';
    const invBet = Math.max(10, Number(inv.bet) || Number(sessionStorage.getItem(BET_KEY)) || 50);

    const msgEl = document.getElementById('sdGlobalInviteMsg');
    const bannerEl = document.getElementById('sdGlobalInviteBanner');
    if (msgEl) {
      msgEl.textContent = `${fromName} ඔබට ${invBet} Coins ඔට්ටුවකට Multiplayer තරඟයකට ආරාධනා කරයි!`;
    }
    if (bannerEl) {
      bannerEl.classList.add('show');
    }

    if (!notifiedIds.has(inviteId)) {
      notifiedIds.add(inviteId);
      const url = `mulitiplay.html?bet=${encodeURIComponent(invBet)}&roomId=${encodeURIComponent(inv.roomId || '')}`;
      showSystemNotification(
        'ශ්‍රී ලංකීය දාම් - Game Invite',
        `${fromName} ඔබට ${invBet} Coins ඔට්ටුවකට ආරාධනා කරයි!`,
        url
      );
    }
  }

  function hideInviteCard(markDismissed) {
    if (markDismissed && activeInvite && activeInvite.inviteId) {
      dismissedIds.add(activeInvite.inviteId);
    }
    const bannerEl = document.getElementById('sdGlobalInviteBanner');
    if (bannerEl) bannerEl.classList.remove('show');
    activeInvite = null;
  }

  async function acceptCurrentInvite() {
    if (!activeInvite || !fbUser || !db) return;
    const { inviteId, roomId, bet } = activeInvite;
    hideInviteCard(true);

    try {
      await db.ref(`invites_v6/${fbUser.uid}/${inviteId}`).update({ status: 'accepted' }).catch(() => {});
      let latestRoom = null;
      if (roomId) {
        const roomSnap = await db.ref(`rooms_v6/${roomId}`).once('value').catch(() => null);
        latestRoom = roomSnap && roomSnap.exists() ? roomSnap.val() : null;
        await db.ref(`rooms_v6/${roomId}`).update({
          status: 'active',
          matchStarted: true,
          guestUid: fbUser.uid,
          guestName: myName,
          startedAt: Date.now()
        });
      }
      navigateToArena(roomId, bet, 'guest', latestRoom ? { ...latestRoom, guestUid: fbUser.uid, guestName: myName } : null);
    } catch (e) {
      console.error('Accept invite failed:', e);
      navigateToArena(roomId, bet, 'guest', null);
    }
  }

  async function declineCurrentInvite() {
    if (!activeInvite || !fbUser || !db) return;
    const { inviteId, roomId } = activeInvite;
    hideInviteCard(true);
    await db.ref(`invites_v6/${fbUser.uid}/${inviteId}`).update({ status: 'declined' }).catch(() => {});
    if (roomId) {
      await db.ref(`rooms_v6/${roomId}`).update({ status: 'declined' }).catch(() => {});
    }
  }

  function watchHostPendingRoom() {
    if (!db || !fbUser || isOnArenaPage()) return;
    if (hostRoomRef) {
      try { hostRoomRef.off(); } catch (_) {}
      hostRoomRef = null;
    }

    let raw = null;
    try {
      raw = JSON.parse(sessionStorage.getItem(PENDING_ROOM_KEY) || 'null');
    } catch (_) {}

    if (!raw || !raw.roomId || raw.hostUid !== fbUser.uid) return;

    hostRoomRef = db.ref(`rooms_v6/${raw.roomId}`);
    hostRoomRef.on('value', (snap) => {
      const room = snap.val();
      if (!room) return;
      if (room.status === 'declined' || room.status === 'cancelled') {
        sessionStorage.removeItem(PENDING_ROOM_KEY);
        if (hostRoomRef) {
          try { hostRoomRef.off(); } catch (_) {}
          hostRoomRef = null;
        }
        return;
      }
      if (room.status === 'accepted' || room.status === 'active' || room.matchStarted === true) {
        navigateToArena(raw.roomId, room.bet || raw.bet, 'host', room);
      }
    });
  }

  function listenForInvites(uid) {
    if (!db || !uid || isOnArenaPage()) return;
    if (invitesRef) {
      try { invitesRef.off(); } catch (_) {}
      invitesRef = null;
    }

    invitesRef = db.ref(`invites_v6/${uid}`);
    invitesRef.on('value', (snap) => {
      const map = snap.val() || {};
      const now = Date.now();
      const pending = Object.entries(map)
        .filter(([id, inv]) =>
          inv &&
          inv.status === 'pending' &&
          (now - (Number(inv.createdAt) || 0) <= INVITE_MAX_AGE_MS) &&
          !dismissedIds.has(id)
        )
        .sort((a, b) => (Number(b[1].createdAt) || 0) - (Number(a[1].createdAt) || 0));

      if (pending.length > 0) {
        const [topId, topInv] = pending[0];
        showInviteCard(topId, topInv);
      } else if (activeInvite) {
        const stillPending = map[activeInvite.inviteId] && map[activeInvite.inviteId].status === 'pending';
        if (!stillPending) hideInviteCard(false);
      }
    });
  }

  window.SinhalaDraughtsInviteBridge = {
    trackHostRoom(roomId, bet) {
      if (!fbUser || !roomId) return;
      sessionStorage.setItem(PENDING_ROOM_KEY, JSON.stringify({
        roomId,
        bet: Number(bet) || 50,
        hostUid: fbUser.uid
      }));
      watchHostPendingRoom();
    },
    clearHostRoom() {
      sessionStorage.removeItem(PENDING_ROOM_KEY);
      if (hostRoomRef) {
        try { hostRoomRef.off(); } catch (_) {}
        hostRoomRef = null;
      }
    },
    goArena: navigateToArena
  };

  function boot() {
    if (!isOnArenaPage()) {
      injectStylesAndBanner();
    }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(DEFAULT_FB_CONFIG);
      }
      auth = firebase.auth();
      db = firebase.database();
    } catch (e) {
      console.error('Global invite bridge Firebase init failed:', e);
      return;
    }

    auth.onAuthStateChanged(async (u) => {
      fbUser = u;
      if (!u) {
        if (invitesRef) { try { invitesRef.off(); } catch (_) {} invitesRef = null; }
        if (hostRoomRef) { try { hostRoomRef.off(); } catch (_) {} hostRoomRef = null; }
        hideInviteCard(false);
        return;
      }

      try {
        const nameSnap = await db.ref(`users_v6/${u.uid}/name`).once('value');
        if (nameSnap.exists() && nameSnap.val()) {
          myName = String(nameSnap.val());
        }
      } catch (_) {}

      listenForInvites(u.uid);
      watchHostPendingRoom();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
