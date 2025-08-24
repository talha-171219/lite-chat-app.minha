// ✅ Firebase SDK v9+ Modular Style
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 🔑 তোমার config
const firebaseConfig = {
  apiKey: "AIzaSyAzgFyreLLQrUhPO9GCIidJGfHE1FbNyJI",
  authDomain: "lite-chat-470a2.firebaseapp.com",
  databaseURL: "https://lite-chat-470a2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lite-chat-470a2",
  storageBucket: "lite-chat-470a2.firebasestorage.app",
  messagingSenderId: "641138173406",
  appId: "1:641138173406:web:6b1cb1ca598b5e6893294f"
};

// ✅ Firebase Init
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ DOM Elements
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");
const emojiBtn = document.getElementById("emojiBtn");
const emojiPanel = document.getElementById("emojiPanel");

// ✅ Username Prompt
const username = prompt("Enter your name:") || "Anonymous";

// ✅ Emoji List
const emojis = ["😀","😁","😂","🤣","😊","😍","😘","😎","😢","😡","👍","👎","🙏","💯","🔥"];
emojis.forEach(e=>{
  const btn=document.createElement("button");
  btn.textContent=e;
  btn.onclick=()=>{ 
    msgInput.value+=e; 
    emojiPanel.style.display='none'; 
  };
  emojiPanel.appendChild(btn);
});

// ✅ Toggle Emoji Panel
emojiBtn.onclick=()=>{
  emojiPanel.style.display=emojiPanel.style.display==='flex'?'none':'flex';
  emojiPanel.style.flexWrap="wrap";
};

// ✅ Send Message
sendBtn.onclick=()=>{
  const text = msgInput.value.trim();
  if(!text) return;
  push(ref(db,"messages"),{
    user: username,
    text: text,
    time: Date.now()
  });
  msgInput.value="";
};

// ✅ Listen for Messages
onChildAdded(ref(db,"messages"), snapshot=>{
  const msg = snapshot.val();
  const div = document.createElement("div");
  div.className="msg " + (msg.user===username?"me":"them");
  div.textContent = msg.user+": "+msg.text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});