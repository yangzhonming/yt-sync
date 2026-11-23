import assert from "node:assert/strict";

const HOST = process.env.YT_SYNC_HOST || "yt-sync.your-subdomain.workers.dev";
const CODE = `TST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function createClient(name, clientId = name) {
  const queue = [];
  const waiters = [];
  const ws = new WebSocket(
    `wss://${HOST}/room/${CODE}/ws?clientId=${encodeURIComponent(clientId)}`
  );
  let closed = false;
  let closeInfo = null;

  const openPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name} open timeout`)), 10000);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    const idx = waiters.findIndex((w) => w.predicate(msg));
    if (idx !== -1) {
      const [w] = waiters.splice(idx, 1);
      clearTimeout(w.timer);
      w.resolve(msg);
    } else {
      queue.push(msg);
    }
  });

  ws.addEventListener("close", (ev) => {
    closed = true;
    closeInfo = { code: ev.code, reason: ev.reason };
  });

  return {
    ws,
    ready: openPromise,
    send(payload) {
      ws.send(JSON.stringify(payload));
    },
    waitFor(typeOrPred, timeoutMs = 10000) {
      const predicate =
        typeof typeOrPred === "function" ? typeOrPred : (m) => m.type === typeOrPred;
      const qIdx = queue.findIndex(predicate);
      if (qIdx !== -1) {
        return Promise.resolve(queue.splice(qIdx, 1)[0]);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`${name} timed out waiting for ${String(typeOrPred)}`)),
          timeoutMs
        );
        waiters.push({
          predicate,
          resolve,
          timer,
        });
      });
    },
    expectNoMessage(type, waitMs = 300) {
      const qIdx = queue.findIndex((m) => m.type === type);
      if (qIdx !== -1) {
        return Promise.reject(new Error(`${name} unexpectedly received ${type}`));
      }
      return new Promise((resolve, reject) => {
        let settled = false;
        const entry = {
          predicate: (m) => m.type === type,
          resolve: () => {
            if (!settled) {
              settled = true;
              reject(new Error(`${name} unexpectedly received ${type}`));
            }
          },
          timer: null,
        };
        entry.timer = setTimeout(() => {
          const i = waiters.indexOf(entry);
          if (i !== -1) waiters.splice(i, 1);
          if (!settled) {
            settled = true;
            resolve();
          }
        }, waitMs);
        waiters.push(entry);
      });
    },
    waitClose(timeoutMs = 10000) {
      if (closed) return Promise.resolve(closeInfo);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${name} close timeout`)), timeoutMs);
        ws.addEventListener("close", (ev) => {
          clearTimeout(timer);
          resolve({ code: ev.code, reason: ev.reason });
        });
      });
    },
    close(code = 1000) {
      ws.close(code);
    },
  };
}

console.log(`Running live integration tests on room ${CODE}...`);

// 1. A joins with peppa_01 -> receives WAITING
const clientA = createClient("ClientA");
await clientA.ready;
clientA.send({ type: "HELLO", videoId: "peppa_01", videoTitle: "小猪佩奇第一集" });
const waitMsg = await clientA.waitFor("WAITING");
assert.equal(waitMsg.activeCount, 1);
console.log("1. [PASS] A joined and received WAITING");

// 2. GET /peek returns expected active room state
const peekRes = await fetch(`https://${HOST}/room/${CODE}/peek`);
assert.equal(peekRes.status, 200);
const peekData = await peekRes.json();
assert.equal(peekData.full, false);
assert.equal(peekData.peerCount, 1);
assert.equal(peekData.videoId, "peppa_01");
console.log("2. [PASS] GET /peek returned expected room state:", JSON.stringify(peekData));

// 3. B joins with sponge_02 -> B receives CONFLICT without downgrading A
clientA.send({ type: "PING", t: Date.now(), delay: 0.03 });
await clientA.waitFor("PONG");
const clientB = createClient("ClientB");
await clientB.ready;
clientB.send({ type: "HELLO", videoId: "sponge_02", videoTitle: "海绵宝宝第一集" });
const conflictMsg = await clientB.waitFor("CONFLICT");
assert.equal(conflictMsg.peerVideoId, "peppa_01");
await clientA.waitFor("ROOM_STATUS");
console.log("3. [PASS] B received non-disruptive CONFLICT with peerVideoId=peppa_01");

// 4. B follows A -> SYNC_PULL -> A ASK_STATE -> REPORT_STATE -> B INIT_STATE, and /peek stays open for C
clientB.send({ type: "CONFLICT_DECISION", decision: "FOLLOW_PEER" });
const navMsg = await clientB.waitFor("NAVIGATE");
assert.equal(navMsg.videoId, "peppa_01");

clientB.send({ type: "SYNC_PULL", videoId: "peppa_01", videoTitle: "小猪佩奇第一集" });
const askAB = await clientA.waitFor("ASK_STATE");
clientA.send({
  type: "REPORT_STATE",
  requesterPeerId: askAB.requesterPeerId,
  videoId: "peppa_01",
  videoTitle: "小猪佩奇第一集",
  currentTime: 42.5,
  playbackRate: 1.0,
  playing: true,
});
const initB = await clientB.waitFor("INIT_STATE");
assert.equal(initB.videoId, "peppa_01");
assert.equal(initB.currentTime, 42.5);
assert.equal(initB.activeCount, 2);
await clientA.waitFor("ROOM_STATUS");

const peekThirdRes = await fetch(`https://${HOST}/room/${CODE}/peek?clientId=ClientC`);
const peekThirdData = await peekThirdRes.json();
assert.equal(peekThirdData.full, false);
assert.equal(peekThirdData.activeCount, 2);
console.log("4. [PASS] B synced with A via 2-step SYNC_PULL and room remained open for 3rd peer");

// 5. 3rd client C joins without ROOM_FULL + 4-in-1 HEARTBEAT/HEARTBEAT_ACK piggybacked drift
const clientC = createClient("ClientC");
await clientC.ready;
clientC.send({ type: "HELLO", videoId: "peppa_01", videoTitle: "小猪佩奇第一集" });
const askAC = await clientA.waitFor("ASK_STATE");
clientA.send({
  type: "REPORT_STATE",
  requesterPeerId: askAC.requesterPeerId,
  videoId: "peppa_01",
  videoTitle: "小猪佩奇第一集",
  currentTime: 60.0,
  playbackRate: 1.0,
  playing: true,
});
const initC = await clientC.waitFor("INIT_STATE");
assert.equal(initC.activeCount, 3);
await clientA.waitFor("ROOM_STATUS");

clientA.send({
  type: "HEARTBEAT",
  t: Date.now(),
  delay: 0.03,
  videoId: "peppa_01",
  videoTitle: "小猪佩奇第一集",
  currentTime: 65.0,
  playbackRate: 1.0,
  playing: true,
});
const ackA = await clientA.waitFor("HEARTBEAT_ACK");
assert.equal(ackA.isRef, true);
assert.equal(ackA.activeCount, 3);

clientC.send({
  type: "HEARTBEAT",
  t: Date.now(),
  delay: 0.05,
  videoId: "peppa_01",
  videoTitle: "小猪佩奇第一集",
  currentTime: 63.0,
  playbackRate: 1.0,
  playing: true,
});
const ackC = await clientC.waitFor("HEARTBEAT_ACK");
assert.equal(ackC.isRef, false);
assert.equal(ackC.activeCount, 3);
assert.ok(ackC.drift && ackC.drift.currentTime >= 65.0);
assert.equal(ackC.drift.totalDelay, 0.08);
console.log("5. [PASS] 3rd peer C joined and 4-in-1 HEARTBEAT_ACK carried extrapolated drift + 0.08s delay");

// 6. Active-only CONTROL broadcast skips AWAY peer B while delivering to active C
clientB.send({ type: "AWAY" });
const awayNoticeA = await clientA.waitFor("PEER_STATUS");
assert.equal(awayNoticeA.status, "away");
assert.equal(awayNoticeA.activeCount, 2);
const awayNoticeC = await clientC.waitFor("PEER_STATUS");
assert.equal(awayNoticeC.status, "away");

clientA.send({
  type: "CONTROL",
  action: "rate",
  videoId: "peppa_01",
  videoTitle: "小猪佩奇第一集",
  currentTime: 70.0,
  playbackRate: 1.5,
  playing: true,
});
const ctrlC = await clientC.waitFor("CONTROL");
assert.equal(ctrlC.action, "rate");
assert.equal(ctrlC.playbackRate, 1.5);
assert.equal(ctrlC.totalDelay, 0.08);
await clientB.expectNoMessage("CONTROL", 300);
console.log("6. [PASS] Active-only CONTROL reached C (0.08s delay) and skipped AWAY peer B");

// 7. keepAway 1-hop instant return peek (no ASK_STATE) + fresh follow (ASK_STATE)
clientB.send({ type: "SYNC_PULL", videoId: "peppa_01", keepAway: true });
const frozenInitB = await clientB.waitFor("INIT_STATE");
assert.ok(frozenInitB.currentTime >= 70.0);
assert.equal(frozenInitB.activeCount, 2);
await clientA.expectNoMessage("ASK_STATE", 150);

clientB.send({ type: "SYNC_PULL", videoId: "peppa_01", keepAway: false });
const askFresh = await clientA.waitFor("ASK_STATE");
clientA.send({
  type: "REPORT_STATE",
  requesterPeerId: askFresh.requesterPeerId,
  videoId: "peppa_01",
  currentTime: 90.0,
  playbackRate: 1.5,
  playing: true,
});
const freshInitB = await clientB.waitFor("INIT_STATE");
assert.equal(freshInitB.currentTime, 90.0);
assert.equal(freshInitB.activeCount, 3);
console.log("7. [PASS] keepAway 1-hop peek avoided ASK_STATE roundtrip, then fresh follow aligned to 90s");

// 8. Same-clientId replacement + mode=resume outdated video auto-follows partner's new video
const clientC2 = createClient("ClientC2", "ClientC");
await clientC2.ready;
const kickedC = await clientC.waitFor("KICKED");
assert.equal(kickedC.type, "KICKED");
const closeC = await clientC.waitClose();
assert.equal(closeC.code, 4002);

clientC2.send({ type: "HELLO", videoId: "old_kpop", videoTitle: "旧Kpop", mode: "resume" });
const autoNav = await clientC2.waitFor("NAVIGATE");
assert.equal(autoNav.videoId, "peppa_01");
assert.equal(autoNav.autoFollow, true);

clientC2.send({ type: "SYNC_PULL", videoId: "peppa_01", videoTitle: "小猪佩奇第一集" });
const askC2 = await clientA.waitFor("ASK_STATE");
clientA.send({
  type: "REPORT_STATE",
  requesterPeerId: askC2.requesterPeerId,
  videoId: "peppa_01",
  currentTime: 100.0,
  playbackRate: 1.5,
  playing: true,
});
const initC2 = await clientC2.waitFor("INIT_STATE");
assert.equal(initC2.activeCount, 3);
console.log("8. [PASS] Same-clientId reconnect + resume outdated video auto-followed peppa_01");

// 9. refPeerId automatic handoff on AWAY + SEARCHING -> PEER_SEARCHING allowlist & relay
clientA.send({ type: "AWAY" });
const awayB = await clientB.waitFor((m) => m.type === "PEER_STATUS" && m.status === "away");
assert.equal(awayB.activeCount, 2);
await clientC2.waitFor((m) => m.type === "PEER_STATUS" && m.status === "away");

clientB.send({
  type: "HEARTBEAT",
  t: Date.now(),
  delay: 0.04,
  videoId: "peppa_01",
  videoTitle: "小猪佩奇第一集",
  currentTime: 105.0,
  playbackRate: 1.0,
  playing: true,
});
const ackB = await clientB.waitFor("HEARTBEAT_ACK");
assert.equal(ackB.isRef, true);

clientC2.send({
  type: "HEARTBEAT",
  t: Date.now(),
  delay: 0.05,
  videoId: "peppa_01",
  videoTitle: "小猪佩奇第一集",
  currentTime: 101.0,
  playbackRate: 1.0,
  playing: true,
});
const ackC2 = await clientC2.waitFor("HEARTBEAT_ACK");
assert.equal(ackC2.isRef, false);
assert.ok(ackC2.drift && ackC2.drift.currentTime >= 105.0);

clientA.send({ type: "BACK" });
await clientB.waitFor((m) => m.type === "PEER_STATUS" && m.status === "back");
await clientC2.waitFor((m) => m.type === "PEER_STATUS" && m.status === "back");

clientA.send({
  type: "SEARCHING",
  query: "海绵宝宝",
  searchUrl: "https://search.bilibili.com/all?keyword=海绵宝宝",
});
const searchB = await clientB.waitFor("PEER_SEARCHING");
assert.equal(searchB.query, "海绵宝宝");
await clientC2.waitFor("PEER_SEARCHING");

clientA.send({
  type: "SEARCHING",
  query: "bad",
  searchUrl: "https://evil.example.com/search?q=bad",
});
await clientB.expectNoMessage("PEER_SEARCHING", 250);
console.log("9. [PASS] refPeerId handed off cleanly on AWAY and SEARCHING relayed allowlisted URLs only");

// 10. SOLO enter/exit aligns to active ref B + passive offline drop vs explicit LEAVE
clientC2.send({ type: "SOLO_ENTER" });
const soloStatusB = await clientB.waitFor((m) => m.type === "ROOM_STATUS" && m.activeCount === 2);
assert.equal(soloStatusB.activeCount, 2);
clientC2.send({ type: "SOLO_EXIT" });
const askSolo = await clientB.waitFor("ASK_STATE");
clientB.send({
  type: "REPORT_STATE",
  requesterPeerId: askSolo.requesterPeerId,
  videoId: "peppa_01",
  currentTime: 112.0,
  playbackRate: 1.5,
  playing: true,
});
const soloSyncC2 = await clientC2.waitFor("INIT_STATE");
assert.equal(soloSyncC2.currentTime, 112.0);

clientC2.close(3001);
const offlineA = await clientA.waitFor((m) => m.type === "PEER_STATUS" && m.status === "offline");
assert.equal(offlineA.activeCount, 2);

clientB.send({ type: "LEAVE" });
const leftA = await clientA.waitFor("PEER_LEFT");
assert.equal(leftA.activeCount, 1);
assert.equal(leftA.explicit, true);
console.log("10. [PASS] SOLO exit aligned to B, passive close emitted offline, explicit LEAVE emitted PEER_LEFT");

clientA.close(1000);
console.log("ALL 10 LIVE INTEGRATION TESTS PASSED!");
