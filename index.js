const functions = require("firebase-functions/v2/database");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const REGION = "asia-southeast1";
const DATABASE_URL = "https://bin-card-42614-default-rtdb.firebaseio.com";
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

setGlobalOptions({ region: REGION });

if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: DATABASE_URL
    });
  } else {
    admin.initializeApp({
      databaseURL: DATABASE_URL
    });
  }
}

const db = admin.database();
const messaging = admin.messaging();

function stringifyData(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) {
      out[String(k)] = String(v);
    }
  }
  return out;
}

/**
 * Extracts FCM registration tokens from `/fcmTokens_v6/{targetUid}` supporting:
 * - single string token
 * - array of tokens or token objects (`{ token }`)
 * - map/object of token strings or token objects (`{ [id]: token | { token } }`)
 * Returns array of `{ token, refPath }`.
 */
function extractTokenEntries(targetUid, rawVal) {
  const basePath = `/fcmTokens_v6/${targetUid}`;
  const entries = [];

  if (!rawVal) return entries;

  if (typeof rawVal === "string") {
    const trimmed = rawVal.trim();
    if (trimmed) entries.push({ token: trimmed, refPath: basePath });
    return entries;
  }

  if (Array.isArray(rawVal)) {
    rawVal.forEach((item, idx) => {
      if (typeof item === "string" && item.trim()) {
        entries.push({ token: item.trim(), refPath: `${basePath}/${idx}` });
      } else if (item && typeof item === "object" && typeof item.token === "string" && item.token.trim()) {
        entries.push({ token: item.token.trim(), refPath: `${basePath}/${idx}` });
      }
    });
    return entries;
  }

  if (typeof rawVal === "object") {
    if (typeof rawVal.token === "string" && rawVal.token.trim()) {
      entries.push({ token: rawVal.token.trim(), refPath: `${basePath}/token` });
    }
    for (const [key, val] of Object.entries(rawVal)) {
      if (key === "token") continue;
      if (typeof val === "string" && val.trim()) {
        entries.push({ token: val.trim(), refPath: `${basePath}/${key}` });
      } else if (val && typeof val === "object" && typeof val.token === "string" && val.token.trim()) {
        entries.push({ token: val.token.trim(), refPath: `${basePath}/${key}` });
      }
    }
  }

  return entries;
}

async function cleanupInvalidToken(entry, rawRootVal) {
  if (!entry || !entry.refPath) return;
  try {
    if (typeof rawRootVal === "string") {
      await db.ref(`/fcmTokens_v6/${entry.refPath.split("/")[2]}`).remove();
      return;
    }
    await db.ref(entry.refPath).remove();
  } catch (err) {
    console.warn(`Failed to remove invalid token at ${entry.refPath}:`, err.message || err);
  }
}

/**
 * Sends high-priority FCM push notifications to all valid tokens under `/fcmTokens_v6/{targetUid}`
 * and cleans up unregistered/invalid tokens.
 */
async function sendPushToUser(targetUid, { title, body, data = {}, channelId = "draughts_alerts" }) {
  if (!targetUid) return;

  const snap = await db.ref(`/fcmTokens_v6/${targetUid}`).once("value");
  const rawVal = snap.val();
  const entries = extractTokenEntries(targetUid, rawVal);

  if (!entries.length) return;

  const stringData = stringifyData({
    ...data,
    title: title || "",
    body: body || ""
  });

  await Promise.all(
    entries.map(async (entry) => {
      const message = {
        token: entry.token,
        notification: {
          title: String(title || "ශ්‍රී ලංකීය දාම්"),
          body: String(body || "")
        },
        data: stringData,
        android: {
          priority: "high",
          notification: {
            channelId,
            sound: "default"
          }
        }
      };

      try {
        await messaging.send(message);
      } catch (err) {
        const code = err && (err.code || (err.errorInfo && err.errorInfo.code));
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          console.info(`Removing stale FCM token for ${targetUid} (${code})`);
          await cleanupInvalidToken(entry, rawVal);
        } else {
          console.error(`FCM send failed for ${targetUid}:`, err);
        }
      }
    })
  );
}

// 1. Incoming Call Trigger: /calls_v6/{toUid}/{callId}
exports.onIncomingCallCreated = functions.onValueCreated(
  { ref: "/calls_v6/{toUid}/{callId}", region: REGION },
  async (event) => {
    const call = event.data.val();
    const { toUid, callId } = event.params;

    if (!call || call.status !== "calling") return null;

    const fromUid = String(call.fromUid || call.uid || "");
    const fromName = String(call.fromName || call.name || "ක්‍රීඩකයා");
    const routeUrl =
      `Callfriend.html?incoming=1&callId=${encodeURIComponent(callId)}` +
      `&uid=${encodeURIComponent(fromUid)}&name=${encodeURIComponent(fromName)}`;

    await sendPushToUser(toUid, {
      title: "ශ්‍රී ලංකීය දාම් - Incoming Call",
      body: `${fromName} ඔබට Call කරයි...`,
      channelId: "draughts_calls",
      data: {
        type: "call",
        callId: String(callId),
        fromUid,
        fromName,
        url: routeUrl
      }
    });

    return null;
  }
);

// 2. Inbox Message Trigger: /inbox_v6/{toUid}/{msgId}
exports.onInboxMessageCreated = functions.onValueCreated(
  { ref: "/inbox_v6/{toUid}/{msgId}", region: REGION },
  async (event) => {
    const msg = event.data.val();
    const { toUid, msgId } = event.params;

    if (!msg) return null;

    const fromUid = String(msg.fromUid || "");
    if (!fromUid || fromUid === String(toUid)) return null;

    const fromName = String(msg.fromName || "ක්‍රීඩකයා");
    const text = String(msg.text || msg.message || "ඔබට නව පණිවිඩයක් ලැබී ඇත.");

    await sendPushToUser(toUid, {
      title: `${fromName} - නව පණිවිඩයක්`,
      body: text,
      channelId: "draughts_messages",
      data: {
        type: "message",
        msgId: String(msgId),
        fromUid,
        fromName,
        text,
        url: "inbox.html"
      }
    });

    return null;
  }
);

// 3a. Multiplayer Invite Trigger: /invites_v6/{toUid}/{inviteId}
exports.onMultiplayerInviteCreated = functions.onValueCreated(
  { ref: "/invites_v6/{toUid}/{inviteId}", region: REGION },
  async (event) => {
    const invite = event.data.val();
    const { toUid, inviteId } = event.params;

    if (!invite) return null;

    const fromName = String(invite.fromName || invite.hostName || "ක්‍රීඩකයා");
    const roomId = String(invite.roomId || "");
    const bet = String(invite.bet || "50");
    const role = String(invite.role || "guest");
    const routeUrl = invite.url ? String(invite.url) : (roomId ? "arena.html" : "friends.html");

    await sendPushToUser(toUid, {
      title: invite.title || "ශ්‍රී ලංකීය දාම් - Multiplayer Invite",
      body: invite.body || `${fromName} ඔබට තරඟ ආරාධනාවක් එවා ඇත! (Bet: ${bet})`,
      channelId: "draughts_invites",
      data: {
        type: "invite",
        inviteId: String(inviteId),
        roomId,
        bet,
        role,
        fromName,
        url: routeUrl
      }
    });

    return null;
  }
);

// 3b. Push Queue Trigger: /fcmPushQueue_v6/{pushId} (and always removes processed entry)
exports.sendInvitePush = functions.onValueCreated(
  { ref: "/fcmPushQueue_v6/{pushId}", region: REGION },
  async (event) => {
    const item = event.data.val();
    try {
      if (item && item.targetUid) {
        const roomId = String(item.roomId || "");
        const bet = String(item.bet || "50");
        const role = String(item.role || "guest");
        const fromName = String(item.fromName || "");
        const defaultUrl = roomId ? "arena.html" : "friends.html";

        await sendPushToUser(item.targetUid, {
          title: item.title || "ශ්‍රී ලංකීය දාම් - Multiplayer Invite",
          body: item.body || "ඔබට නව තරඟ ආරාධනාවක් ලැබී ඇත!",
          channelId: item.channelId || "draughts_invites",
          data: {
            type: item.type || "invite",
            roomId,
            bet,
            role,
            fromName,
            url: item.url || defaultUrl
          }
        });
      }
    } catch (err) {
      console.error("FCM Cloud Function error:", err);
    } finally {
      await event.data.ref.remove().catch(() => {});
    }
    return null;
  }
);

// 4. Standalone Node.js Worker Mode (`node index.js` / `npm start`)
if (require.main === module) {
  console.log("Sinhala Draughts Push Worker started (Node.js 20)...");

  db.ref("/calls_v6").on("child_added", (userCallsSnap) => {
    const toUid = userCallsSnap.key;
    userCallsSnap.ref.on("child_added", async (callSnap) => {
      const call = callSnap.val();
      if (!call || call.status !== "calling") return;
      const callId = callSnap.key;
      const fromUid = String(call.fromUid || call.uid || "");
      const fromName = String(call.fromName || call.name || "ක්‍රීඩකයා");
      const routeUrl =
        `Callfriend.html?incoming=1&callId=${encodeURIComponent(callId)}` +
        `&uid=${encodeURIComponent(fromUid)}&name=${encodeURIComponent(fromName)}`;

      await sendPushToUser(toUid, {
        title: "ශ්‍රී ලංකීය දාම් - Incoming Call",
        body: `${fromName} ඔබට Call කරයි...`,
        channelId: "draughts_calls",
        data: { type: "call", callId, fromUid, fromName, url: routeUrl }
      });
    });
  });

  db.ref("/inbox_v6").on("child_added", (userInboxSnap) => {
    const toUid = userInboxSnap.key;
    userInboxSnap.ref.on("child_added", async (msgSnap) => {
      const msg = msgSnap.val();
      if (!msg) return;
      const fromUid = String(msg.fromUid || "");
      if (!fromUid || fromUid === String(toUid)) return;
      const fromName = String(msg.fromName || "ක්‍රීඩකයා");
      const text = String(msg.text || msg.message || "ඔබට නව පණිවිඩයක් ලැබී ඇත.");

      await sendPushToUser(toUid, {
        title: `${fromName} - නව පණිවිඩයක්`,
        body: text,
        channelId: "draughts_messages",
        data: { type: "message", msgId: msgSnap.key, fromUid, fromName, text, url: "inbox.html" }
      });
    });
  });

  db.ref("/invites_v6").on("child_added", (userInvitesSnap) => {
    const toUid = userInvitesSnap.key;
    userInvitesSnap.ref.on("child_added", async (invSnap) => {
      const invite = invSnap.val();
      if (!invite) return;
      const fromName = String(invite.fromName || invite.hostName || "ක්‍රීඩකයා");
      const roomId = String(invite.roomId || "");
      const bet = String(invite.bet || "50");
      const role = String(invite.role || "guest");
      const routeUrl = invite.url ? String(invite.url) : (roomId ? "arena.html" : "friends.html");

      await sendPushToUser(toUid, {
        title: invite.title || "ශ්‍රී ලංකීය දාම් - Multiplayer Invite",
        body: invite.body || `${fromName} ඔබට තරඟ ආරාධනාවක් එවා ඇත! (Bet: ${bet})`,
        channelId: "draughts_invites",
        data: { type: "invite", inviteId: invSnap.key, roomId, bet, role, fromName, url: routeUrl }
      });
    });
  });

  db.ref("/fcmPushQueue_v6").on("child_added", async (snap) => {
    const item = snap.val();
    try {
      if (item && item.targetUid) {
        const roomId = String(item.roomId || "");
        const bet = String(item.bet || "50");
        const role = String(item.role || "guest");
        const fromName = String(item.fromName || "");
        const defaultUrl = roomId ? "arena.html" : "friends.html";

        await sendPushToUser(item.targetUid, {
          title: item.title || "ශ්‍රී ලංකීය දාම් - Multiplayer Invite",
          body: item.body || "ඔබට නව තරඟ ආරාධනාවක් ලැබී ඇත!",
          channelId: item.channelId || "draughts_invites",
          data: {
            type: item.type || "invite",
            roomId,
            bet,
            role,
            fromName,
            url: item.url || defaultUrl
          }
        });
      }
    } catch (err) {
      console.error("Push worker error:", err);
    } finally {
      await snap.ref.remove().catch(() => {});
    }
  });
}
