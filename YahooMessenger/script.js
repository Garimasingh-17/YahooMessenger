let contacts = []; // will be filled dynamically

let firstChatOpened = false;
let mainChatUser = null; // ✅ Track which user is in main chat
let pendingChatName = "";

const socket = io("http://localhost:5000"); // or your deployed backend URL
const username = localStorage.getItem("username");

// Register the user with socket server
if (username) {
  socket.emit("register", username);
}

socket.on("receive-message", ({ from, message }) => {
  const isFile = message.startsWith("[file]::");
  const parts = isFile ? message.split("::") : null;
  const fileName = parts?.[1];
  const fileURL = parts?.[2];
  const fileType = parts?.[3];

  const target = from === mainChatUser ? "main" : from;
  const msgContainer = target === "main"
    ? document.getElementById("mainMessages")
    : document.getElementById(`messages-${from}`);

  if (!msgContainer) return;

  const msg = document.createElement("div");
  msg.className = "message message-them";

  if (isFile && fileType.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = fileURL;
    img.style.maxWidth = "200px";
    img.style.borderRadius = "8px";
    msg.appendChild(img);
  } else if (isFile) {
    const link = document.createElement("a");
    link.href = fileURL;
    link.download = fileName;
    link.textContent = `📎 ${fileName}`;
    link.target = "_blank";
    msg.appendChild(link);
  } else {
    msg.textContent = message;
  }

  msgContainer.appendChild(msg);
  msgContainer.scrollTop = msgContainer.scrollHeight;
});



const contactList = document.getElementById("contactList");
const sideChats = document.getElementById("sideChats");

window.onload = () => {
  // Clear main chat title and messages on every load
  document.querySelector("#mainChat .chat-header").innerText = "Main Chat";
  document.getElementById("mainMessages").innerHTML = "";

  firstChatOpened = false; // reset the flag

  fetchContactsFromDB();
  restoreChats();
  initThemeToggle();
  initAvatarUpload();
  setupEmojiPickers();
};


function renderContacts() {
  contactList.innerHTML = "";
  contacts.forEach(contact => {
    const div = document.createElement("div");
    div.className = "contact";
    div.onclick = () => openChat(contact.name, contact.img);
    div.innerHTML = `
      <img class="contact-avatar" src="https://i.pravatar.cc/30?img=${contact.img}">
      <span class="contact-name">${contact.name}</span>
    `;
    contactList.appendChild(div);
  });
}

function openChat(name, img) {
  if (document.getElementById(`chat-${name}`)) return;
  if (mainChatUser === name) return;

  if (!firstChatOpened) {
    // ✅ Use main chat for the first user
    const header = document.querySelector("#mainChat .chat-header");
    header.innerText = name;

    const messages = document.getElementById("mainMessages");
    messages.innerHTML = "";

    mainChatUser = name;
    const sendBtn = document.querySelector("#mainChat .chat-send-button");
    sendBtn.onclick = sendMainMessage;

    firstChatOpened = true;

    // ✅ Load message history for main chat
    loadChatHistory(name);
  } else {
    // ✅ Create side chat box
    const chatWindow = document.createElement('div');
    chatWindow.className = 'chat-window side';
    chatWindow.id = `chat-${name}`;
    chatWindow.innerHTML = `
      <div class="chat-header">
        ${name}
        <button onclick="closeChat('${name}')">✖</button>
      </div>
      <div class="chat-messages" id="messages-${name}"></div>
      <div class="chat-input-container">
        <textarea class="chat-input" id="input-${name}" placeholder="Reply to ${name}..."></textarea>
        <input type="file" class="file-input" id="file-${name}" onchange="handleFileUpload(event, '${name}')"/>
        <button class="emoji-btn" data-target="input-${name}">😊</button>
        <button class="chat-send-button" onclick="sendMessage('${name}')">Send</button>
      </div>
    `;

    sideChats.appendChild(chatWindow);
    setupEmojiPicker(`input-${name}`);
    saveChatState(name);

    // ✅ Load message history for side chat
    loadChatHistory(name);
  }
}


function loadChatHistory(name) {
  const currentUser = localStorage.getItem("username");

  fetch(`http://localhost:5000/api/messages/${currentUser}/${name}`)
    .then(res => res.json())
    .then(data => {
      const container = (mainChatUser === name)
        ? document.getElementById("mainMessages")
        : document.getElementById(`messages-${name}`);

      if (!container) return;

      container.innerHTML = "";

      data.forEach(msg => {
        const msgDiv = document.createElement("div");
        msgDiv.className = (msg.sender === currentUser)
          ? "message message-me"
          : "message message-them";

        // ✅ Detect [file]:: message (used for files/images)
        if (msg.message.startsWith("[file]::")) {
          const parts = msg.message.split("::");
          const fileName = parts[1];
          const fileURL = parts[2];
          const fileType = parts[3];

          if (fileType?.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = fileURL;
            img.style.maxWidth = "200px";
            img.style.borderRadius = "8px";
            msgDiv.appendChild(img);
          } else {
            const link = document.createElement("a");
            link.href = fileURL;
            link.download = fileName;
            link.textContent = `📎 ${fileName}`;
            link.target = "_blank";
            msgDiv.appendChild(link);
          }
        } else {
          // ✅ Regular text message
          msgDiv.textContent = msg.message;
        }

        container.appendChild(msgDiv);
      });

      container.scrollTop = container.scrollHeight;
    })
    .catch(err => console.error("❌ Failed to load chat history:", err));
}



function closeChat(name) {
  const el = document.getElementById(`chat-${name}`);
  if (el) el.remove();
  removeChatState(name);
}

function sendMessage(name) {
  const input = document.getElementById(`input-${name}`);

  const value = input.value.trim();
  if (!value) return;

  console.log("➡️ Sending to:", name); // or mainChatUser

  // Send message via Socket.IO
  socket.emit("send-message", {
    to: name,
    message: value
  });

  // Show your message in the UI
  const msgContainer = document.getElementById(`messages-${name}`);
  const msg = document.createElement("div");
  msg.className = "message message-me";
  msg.textContent = value;
  msgContainer.appendChild(msg);
msgContainer.scrollTop = msgContainer.scrollHeight;

  input.value = "";
}

function sendMainMessage() {
  const input = document.getElementById("mainInput");
  const value = input.value.trim();

  if (!value) return;

  if (!mainChatUser) {
    alert("No user selected in main chat.");
    return;
  }

  socket.emit("send-message", {
    to: mainChatUser,
    message: value
  });

  const msgContainer = document.getElementById("mainMessages");
  const msg = document.createElement("div");
  msg.className = "message message-me";
  msg.textContent = value;
  msgContainer.appendChild(msg);
  msgContainer.scrollTop = msgContainer.scrollHeight;

  input.value = "";
}



function saveChatState(name) {
  if (!firstChatOpened) return; // ✅ Don’t save first chat (main chat) state
  let open = JSON.parse(localStorage.getItem("openChats") || "[]");
  if (!open.includes(name)) {
    open.push(name);
    localStorage.setItem("openChats", JSON.stringify(open));
  }
}


function removeChatState(name) {
  let open = JSON.parse(localStorage.getItem("openChats") || "[]");
  open = open.filter(c => c !== name);
  localStorage.setItem("openChats", JSON.stringify(open));
}

function restoreChats() {
  let open = JSON.parse(localStorage.getItem("openChats") || "[]");
  open.forEach(name => {
    const contact = contacts.find(c => c.name === name);
    if (contact) {
      // Skip the firstChatOpened logic when restoring (always open as side chat)
      const chatWindow = document.createElement('div');
      chatWindow.className = 'chat-window side';
      chatWindow.id = `chat-${name}`;
      chatWindow.innerHTML = `
        <div class="chat-header">
          ${name}
          <button onclick="closeChat('${name}')">✖</button>
        </div>
        <div class="chat-messages" id="messages-${name}">
          <div class="message message-them">Hello from ${name}!</div>
        </div>
        <div class="chat-input-container">
          <textarea class="chat-input" id="input-${name}" placeholder="Reply to ${name}..."></textarea>
          <button class="emoji-btn" data-target="input-${name}">😊</button>
          <button class="chat-send-button" onclick="sendMessage('${name}')">Send</button>
        </div>
      `;
      sideChats.appendChild(chatWindow);
      setupEmojiPicker(`input-${name}`);
    }
  });
}


function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light");
    toggle.checked = true;
  }
  toggle.onchange = () => {
    document.body.classList.toggle("light");
    localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
  };
}

function initAvatarUpload() {
  const input = document.getElementById("avatarInput");
  const avatar = document.getElementById("avatar");
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        avatar.src = e.target.result;
        localStorage.setItem("avatar", e.target.result);
      };
      reader.readAsDataURL(file);
    }
  });
  const savedAvatar = localStorage.getItem("avatar");
  if (savedAvatar) avatar.src = savedAvatar;
}

function setupEmojiPickers() {
  document.querySelectorAll(".emoji-btn").forEach(btn => {
    const targetId = btn.getAttribute("data-target");
    setupEmojiPicker(targetId);
  });
}

function setupEmojiPicker(targetId) {
  const picker = new EmojiButton();
  const btn = document.querySelector(`.emoji-btn[data-target="${targetId}"]`);
  const input = document.getElementById(targetId);
  btn.addEventListener("click", () => {
    picker.togglePicker(btn);
  });
  picker.on("emoji", emoji => {
    input.value += emoji;
    input.focus();
  });
}
function toggleSettings() {
  document.getElementById("settingsPanel").classList.toggle("active");

  // Load settings when opened
  const username = localStorage.getItem("username");
  const theme = localStorage.getItem("theme");
  const chatsVisible = localStorage.getItem("chatVisible") !== "false";

  document.getElementById("settingsName").value = username || "Manjunath";
  document.getElementById("settingsThemeToggle").checked = theme === "light";
  document.getElementById("settingsChatToggle").checked = chatsVisible;
}

function saveSettings() {
  const newName = document.getElementById("settingsName").value;
  localStorage.setItem("username", newName);
  document.querySelector(".user-info span").textContent = newName;

  const themeOn = document.getElementById("settingsThemeToggle").checked;
  document.body.classList.toggle("light", themeOn);
  localStorage.setItem("theme", themeOn ? "light" : "dark");

  const chatsVisible = document.getElementById("settingsChatToggle").checked;
  document.querySelector(".chat-layout").style.display = chatsVisible ? "flex" : "none";
  localStorage.setItem("chatVisible", chatsVisible);

  const avatarInput = document.getElementById("settingsAvatarInput");
  const avatar = document.getElementById("avatar");
  if (avatarInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      avatar.src = e.target.result;
      localStorage.setItem("avatar", e.target.result);
    };
    reader.readAsDataURL(avatarInput.files[0]);
  }

  toggleSettings();
}

// Restore settings on page load
window.addEventListener("load", () => {
  const savedName = localStorage.getItem("username");
  if (savedName) document.querySelector(".user-info span").textContent = savedName;

  const chatVisible = localStorage.getItem("chatVisible");
  if (chatVisible === "false") {
    document.querySelector(".chat-layout").style.display = "none";
  }
});
function toggleSettings() {
  document.getElementById("settingsPanel").classList.toggle("active");

  // Load settings when opened
  const username = localStorage.getItem("username");
  const theme = localStorage.getItem("theme");
  const chatsVisible = localStorage.getItem("chatVisible") !== "false";

  document.getElementById("settingsName").value = username || "Manjunath";
  document.getElementById("settingsThemeToggle").checked = theme === "light";
  document.getElementById("settingsChatToggle").checked = chatsVisible;
}

function saveSettings() {
  const newName = document.getElementById("settingsName").value;
  localStorage.setItem("username", newName);
  document.querySelector(".user-info span").textContent = newName;

  const themeOn = document.getElementById("settingsThemeToggle").checked;
  document.body.classList.toggle("light", themeOn);
  localStorage.setItem("theme", themeOn ? "light" : "dark");

  const chatsVisible = document.getElementById("settingsChatToggle").checked;
  document.querySelector(".chat-layout").style.display = chatsVisible ? "flex" : "none";
  localStorage.setItem("chatVisible", chatsVisible);

  const avatarInput = document.getElementById("settingsAvatarInput");
  const avatar = document.getElementById("avatar");
  if (avatarInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      avatar.src = e.target.result;
      localStorage.setItem("avatar", e.target.result);
    };
    reader.readAsDataURL(avatarInput.files[0]);
  }

  toggleSettings();
}

// Restore settings on page load
window.addEventListener("load", () => {
  const savedName = localStorage.getItem("username");
  if (savedName) document.querySelector(".user-info span").textContent = savedName;

  const chatVisible = localStorage.getItem("chatVisible");
  if (chatVisible === "false") {
    document.querySelector(".chat-layout").style.display = "none";
  }
});

function fetchContactsFromDB() {
  fetch("http://localhost:5000/api/auth/users")
    .then(res => res.json())
    .then(data => {
     const currentUsername = localStorage.getItem("username");
contacts = data
  .filter(user => user.username !== currentUsername)
  .map((user, i) => ({
    name: user.username,
    img: 10 + (i % 70)
  }));

      renderContacts();
      restoreChats();
    })
    .catch(err => {
      console.error("Failed to load contacts:", err);
    });
}
function handleFileUpload(event, chatTarget) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const fileURL = e.target.result;
    const container = chatTarget === "main"
      ? document.getElementById("mainMessages")
      : document.getElementById(`messages-${chatTarget}`);

    const msg = document.createElement("div");
    msg.className = "message message-me";

    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = fileURL;
      img.style.maxWidth = "200px";
      img.style.borderRadius = "8px";
      msg.appendChild(img);
    } else {
      const link = document.createElement("a");
      link.href = fileURL;
      link.download = file.name;
      link.textContent = `📎 ${file.name}`;
      link.target = "_blank";
      msg.appendChild(link);
    }

    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;

    // Send to server via socket.io
    socket.emit("send-message", {
      to: chatTarget === "main" ? mainChatUser : chatTarget,
      message: `[file]::${file.name}::${fileURL}::${file.type}`
    });
  };

  // Read file as DataURL
  reader.readAsDataURL(file);
}
