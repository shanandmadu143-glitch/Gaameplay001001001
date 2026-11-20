/* global firebase */
(function () {
  'use strict';

  const MULTI_ROOM_KEY = 'sinhala_draughts_multi_room';
  const BET_KEY = 'sinhala_draughts_bet';

  const FB_CONFIG = {
    apiKey: 'AIzaSyBnGTuZKekAWA4vBUgfzZZ2CeO8wyR1HaI',
    authDomain: 'bin-card-42614.firebaseapp.com',
    databaseURL: 'https://bin-card-42614-default-rtdb.firebaseio.com',
    projectId: 'bin-card-42614',
    storageBucket: 'bin-card-42614.firebasestorage.app',
    messagingSenderId: '1063550230753',
    appId: '1:1063550230753:web:1ad8306405e709ac5b17a0'
  };

  function getMatchContext() {
    const params = new URLSearchParams(window.location.search);
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(MULTI_ROOM_KEY) || 'null');
    } catch (_) {}

    const mode = params.get('mode') || (saved && saved.roomId ? 'multi' : 'single');
    const roomId = params.get('roomId') || (saved && saved.roomId) || '';
    const role = params.get('role') || (saved && saved.role) || 'host';
    const bet = Math.max(
      10,
      Number(params.get('bet')) ||
      (saved && Number(saved.bet)) ||
      Number(sessionStorage.getItem(BET_KEY)) ||
      50
    );

    return {
      isMulti: mode === 'multi',
      mode,
      roomId,
      role,
      bet,
      hostName: (saved && saved.hostName) || 'Host',
      guestName: (saved && saved.guestName) || 'Guest'
    };
  }

  function applyMatchInfoToExistingElements(ctx) {
    const betTargets = ['#betVal', '#betAmount', '.bet-amount', '[data-bet]'];
    betTargets.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el && el.children.length === 0) {
          el.textContent = String(ctx.bet);
        }
      });
    });
  }

  function initArenaMultiplayerBridge() {
    const ctx = getMatchContext();
    window.SinhalaDraughtsArenaMatch = ctx;

    if (!ctx.isMulti) return;

    sessionStorage.setItem(BET_KEY, String(ctx.bet));
    applyMatchInfoToExistingElements(ctx);

    if (typeof window.onMultiplayerArenaReady === 'function') {
      window.onMultiplayerArenaReady(ctx);
    }

    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          firebase.initializeApp(FB_CONFIG);
        }
        const db = firebase.database();
        const auth = firebase.auth();

        if (ctx.roomId && db) {
          const roomRef = db.ref(`rooms_v6/${ctx.roomId}`);
          roomRef.on('value', (snap) => {
            const room = snap.val();
            if (!room) return;
            window.SinhalaDraughtsLiveRoom = room;
            if (typeof window.onMultiplayerRoomUpdate === 'function') {
              window.onMultiplayerRoomUpdate(room, ctx);
            }
          });

          auth.onAuthStateChanged((u) => {
            if (!u) return;
            const updatePayload = {};
            if (ctx.role === 'guest') {
              updatePayload.guestUid = u.uid;
              updatePayload.guestJoinedAt = Date.now();
              updatePayload.status = 'active';
            } else {
              updatePayload.hostUid = u.uid;
              updatePayload.hostJoinedAt = Date.now();
            }
            roomRef.update(updatePayload).catch(() => {});
          });
        }
      }
    } catch (e) {
      console.warn('Arena multiplayer bridge warning:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArenaMultiplayerBridge);
  } else {
    initArenaMultiplayerBridge();
  }
})();
