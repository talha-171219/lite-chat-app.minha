// ✅ Firebase SDK v9+ Modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot,
  doc, updateDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔑 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAzgFyreLLQrUhPO9GCIidJGfHE1FbNyJI",
  authDomain: "lite-chat-470a2.firebaseapp.com",
  projectId: "lite-chat-470a2",
  storageBucket: "lite-chat-470a2.appspot.com",
  messagingSenderId: "641138173406",
  appId: "1:641138173406:web:6b1cb1ca598b5e6893294f"
};

// ✅ Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== DOM =====
const loginScreen = document.getElementById("login-screen");
const appEl = document.getElementById("app");
const pwdInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const emojiBtn = document.getElementById("emojiBtn");
const emojiPanel = document.getElementById("emojiPanel");

const headerUsername = document.getElementById("header-username");
const headerAvatar = document.getElementById("header-avatar");
const logoutBtn = document.getElementById("logout-btn");

const replyDraft = document.getElementById("reply-draft");
const replyUserEl = document.getElementById("reply-user");
const replyTextEl = document.getElementById("reply-text");
const replyCancelBtn = document.getElementById("reply-cancel");

// ===== App Password =====
const APP_PASSWORD = "258090";
let username = null;

// reply state (for next outgoing message)
let replyState = null;

// reactions
const REACTIONS = ["❤","😂","👍","🔥","🙏"];

// ===== Login flow =====
loginBtn.addEventListener("click", () => {
  if (pwdInput.value === APP_PASSWORD) {
    username = prompt("Enter your name:") || "Anonymous";
    headerUsername.textContent = username;
    headerAvatar.textContent = (username[0] || "U").toUpperCase();
    loginScreen.classList.add("hidden");
    appEl.classList.remove("hidden");
    msgInput.focus();
  } else {
    loginError.textContent = "❌ Wrong Password!";
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  username = null;
  pwdInput.value = "";
  loginError.textContent = "";
  appEl.classList.add("hidden");
  loginScreen.classList.remove("hidden");
});

// ===== Emojis panel =====
const emojis = ["😀","😁","😂","🤣","😊","😍","😘","😎","😢","😡","👍","👎","🙏","💯","🔥"];
emojiPanel.style.display = "none";
emojiPanel.style.flexWrap = "wrap";
emojiBtn.addEventListener("click", () => {
  const visible = emojiPanel.style.display === "flex";
  emojiPanel.style.display = visible ? "none" : "flex";
  emojiPanel.setAttribute("aria-hidden", visible ? "true" : "false");
});
emojis.forEach(e => {
  const b = document.createElement("button");
  b.textContent = e;
  b.addEventListener("click", () => {
    msgInput.value += e;
    emojiPanel.style.display = "none";
    msgInput.focus();
  });
  emojiPanel.appendChild(b);
});

// ===== Send Logic =====
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !username) return;

  // attach reply (if any)
  const payload = {
    user: username,
    text,
    time: Date.now()
  };
  if (replyState) {
    payload.replyTo = {
      id: replyState.id,
      user: replyState.user,
      text: replyState.text.slice(0, 160)
    };
  }

  await addDoc(collection(db, "messages"), payload);

  // clear input + reply draft
  msgInput.value = "";
  clearReplyDraft();
}

sendBtn.addEventListener("click", sendMessage);

// Enter to send (Shift+Enter = new line)
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ===== Reply Draft UI =====
function setReplyDraft(msg) {
  replyState = { id: msg.id, user: msg.user, text: msg.text };
  replyUserEl.textContent = msg.user;
  replyTextEl.textContent = msg.text;
  replyDraft.classList.remove("hidden");
  msgInput.focus();
}
function clearReplyDraft() {
  replyState = null;
  replyDraft.classList.add("hidden");
}
replyCancelBtn.addEventListener("click", clearReplyDraft);

// ===== Format Time =====
function formatDateTime(ts) {
  const date = new Date(ts);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" }); // Aug
  let hours = date.getHours();
  let minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return ${day} ${month} ${hours}:${minutes}${ampm};
}

// ===== Reaction helpers (use arrayUnion/arrayRemove with "emoji::user") =====
async function toggleReaction(msgId, emoji) {
  if (!username) return;
  const key = ${emoji}::${username};
  const ref = doc(db, "messages", msgId);

  // naive toggle: try remove first, if nothing removed Firestore keeps same; then add.
  // But arrayRemove needs exact match; to truly toggle, we read DOM dataset to know current state:
  const chipEl = document.querySelector(.msg[data-id="${msgId}"] .reaction-chip[data-emoji="${emoji}"]);
  const alreadyReacted = chipEl?.classList.contains("me-reacted");

  if (alreadyReacted) {
    await updateDoc(ref, { reactions: arrayRemove(key) });
  } else {
    await updateDoc(ref, { reactions: arrayUnion(key) });
  }
}

function groupReactions(reactionsArr = []) {
  // reactionsArr: ["❤::Alice", "❤::Bob", "😂::Alice", ...]
  const map = new Map(); // emoji -> Set(users)
  reactionsArr.forEach(entry => {
    const [emoji, user] = entry.split("::");
    if (!emoji || !user) return;
    if (!map.has(emoji)) map.set(emoji, new Set());
    map.get(emoji).add(user);
  });
  return map; // Map<emoji, Set<user>>
}

// ===== Render Message Bubble =====
function renderMessage(m) {
  const bubble = document.createElement("div");
  bubble.className = "msg " + (m.user === username ? "me" : "them");
  bubble.dataset.id = m.id;

  // quoted (reply) if exists
  if (m.replyTo) {
    const q = document.createElement("div");
    q.className = "reply-quote";
    q.innerHTML = `<div class="q-user">${escapeHTML(m.replyTo.user)}</div>
                   <div class="q-text">${escapeHTML(m.replyTo.text)}</div>`;
    bubble.appendChild(q);
  }

  // main text
  const textEl = document.createElement("div");
  textEl.textContent = ${m.user}: ${m.text};
  bubble.appendChild(textEl);

  // actions (Reply & React)
  const actions = document.createElement("div");
  actions.className = "actions";
  const replyBtn = document.createElement("button");
  replyBtn.className = "action-btn";
  replyBtn.textContent = "↩ Reply";
  replyBtn.addEventListener("click", () => setReplyDraft(m));

  const reactBtn = document.createElement("button");
  reactBtn.className = "action-btn";
  reactBtn.textContent = "😊 React";
  reactBtn.addEventListener("click", () => {
    bubble.classList.toggle("show-picker");
  });

  actions.appendChild(replyBtn);
  actions.appendChild(reactBtn);
  bubble.appendChild(actions);

  // reaction picker
  const picker = document.createElement("div");
  picker.className = "reaction-picker";
  REACTIONS.forEach(em => {
    const b = document.createElement("button");
    b.textContent = em;
    b.addEventListener("click", () => toggleReaction(m.id, em));
    picker.appendChild(b);
  });
  bubble.appendChild(picker);

  // reactions bar (chips)
  const bar = document.createElement("div");
  bar.className = "reactions";
  // fill later via applyReactions()
  bubble.appendChild(bar);

  // timestamp
  const timeEl = document.createElement("div");
  timeEl.className = "timestamp";
  timeEl.textContent = formatDateTime(m.time);
  bubble.appendChild(timeEl);

  return bubble;
}

function applyReactions(bubble, reactionsArr) {
  const bar = bubble.querySelector(".reactions");
  bar.innerHTML = "";
  const map = groupReactions(reactionsArr);
  if (map.size === 0) return;

  for (const [emoji, users] of map.entries()) {
    const chip = document.createElement("div");
    chip.className = "reaction-chip";
    chip.dataset.emoji = emoji;
    if (users.has(username)) chip.classList.add("me-reacted");
    chip.textContent = ${emoji} ${users.size};
    chip.title = Array.from(users).join(", ");
    chip.addEventListener("click", () => toggleReaction(bubble.dataset.id, emoji));
    bar.appendChild(chip);
  }
}

// very small HTML escape helper
function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

// ===== Realtime Messages =====
const q = query(collection(db, "messages"), orderBy("time"));
onSnapshot(q, (snap) => {
  messagesDiv.innerHTML = "";

  snap.forEach(d => {
    const data = d.data();
    const m = {
      id: d.id,
      user: data.user,
      text: data.text,
      time: data.time,
      replyTo: data.replyTo || null,
      reactions: data.reactions || []   // ["❤::Alice", ...]
    };

    const bubble = renderMessage(m);
    messagesDiv.appendChild(bubble);
    applyReactions(bubble, m.reactions);
  });

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// ===== Click outside to close reaction picker =====
document.addEventListener("click", (e) => {
  const bubble = e.target.closest(".msg");
  document.querySelectorAll(".msg.show-picker").forEach(el => {
    if (el !== bubble) el.classList.remove("show-picker");
  });
});
