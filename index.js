const functions = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const DATABASE_URL = "https://bin-card-42614-default-rtdb.firebaseio.com";

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

async function processPushItem(targetUid, payloadData = {}) {
  if (!targetUid) return;

  const tokenSnap = await admin.database().ref(`/fcmTokens_v6/${targetUid}/token`).once("value");
  const fcmToken = tokenSnap.val();

  if (!fcmToken) return;

  const message = {
    token: fcmToken,
    notification: {
      title: payloadData.title || "ශ්‍රී ලංකීය දාම් - Multiplayer Invite",
      body: payloadData.body || "ඔබට නව තරඟ ආරාධනාවක් ලැබී ඇත!"
    },
    data: {
      url: payloadData.url || "./mulitiplay.html",
      roomId: String(payloadData.roomId || ""),
      bet: String(payloadData.bet || "50")
    },
    android: {
      priority: "high",
      notification: {
        channelId: "draughts_invites",
        sound: "default"
      }
    }
  };

  await admin.messaging().send(message);
}

// 1. Firebase Cloud Function (v2) export
exports.sendInvitePush = functions.onValueCreated(
  { ref: "/fcmPushQueue_v6/{pushId}", region: "asia-southeast1" },
  async (event) => {
    const item = event.data.val();
    try {
      if (item && item.targetUid) {
        await processPushItem(item.targetUid, item);
      }
    } catch (err) {
      console.error("FCM Cloud Function error:", err);
    } finally {
      await event.data.ref.remove().catch(() => {});
    }
    return null;
  }
);

// 2. Standalone Node.js Worker mode (when run directly via `node index.js` / `npm start`)
if (require.main === module) {
  const queueRef = admin.database().ref("/fcmPushQueue_v6");
  console.log("Sinhala Draughts Push Worker started (watching /fcmPushQueue_v6)...");

  queueRef.on("child_added", async (snap) => {
    const item = snap.val();
    if (!item || !item.targetUid) {
      await snap.ref.remove().catch(() => {});
      return;
    }
    try {
      await processPushItem(item.targetUid, item);
    } catch (err) {
      console.error("Push worker error:", err);
    } finally {
      await snap.ref.remove().catch(() => {});
    }
  });
}
