// =====================
// CONSTANTS & STATE
// =====================
const API_BASE = "http://localhost:8000";

// Keys for localStorage — using constants prevents typos
const STORAGE_KEYS = {
  VIDEO_ID:  "yt_chat_video_id",
  VIDEO_URL: "yt_chat_video_url",
  MESSAGES:  "yt_chat_messages",
};

const state = {
  videoId: null,
  isLoading: false,
  // In-memory copy of the messages array.
  // Kept in sync with localStorage every time a message is added.
  messages: [],
};


// =====================
// STARTUP — runs when the page loads
// =====================
window.addEventListener("load", () => {
  restoreSession();
});

function restoreSession() {
  /*
    When the page loads, check if there's a saved session.
    If yes: restore the video ID and all messages so the user
    continues exactly where they left off.
  */
  const savedVideoId  = localStorage.getItem(STORAGE_KEYS.VIDEO_ID);
  const savedVideoUrl = localStorage.getItem(STORAGE_KEYS.VIDEO_URL);
  const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);

  if (savedVideoId) {
    state.videoId = savedVideoId;

    // Restore the URL in the input box
    if (savedVideoUrl) {
      document.getElementById("url-input").value = savedVideoUrl;
    }

    // Show the user that the video is still indexed
    showStatus(`✓ Previous session restored — ${savedVideoId}`, "success");
  }

  if (savedMessages) {
    /*
      JSON.parse turns the saved string back into a real array.
      This is the reverse of JSON.stringify() which we use when saving.
    */
    const messages = JSON.parse(savedMessages);

    // Rebuild the visual chat from the saved data
    if (messages.length > 0) {
      removeWelcomeMessage();
      messages.forEach(msg => {
        // Re-render each message without saving it again
        renderMessage(msg.role, msg.text, msg.time, false);
      });
      state.messages = messages;
    }
  }
}

function saveSession() {
  /*
    Save the current state to localStorage.
    Called every time a message is added or a video is loaded.
    Uses JSON.stringify to convert the messages array to a string.
  */
  localStorage.setItem(STORAGE_KEYS.VIDEO_ID, state.videoId || "");
  localStorage.setItem(
    STORAGE_KEYS.VIDEO_URL,
    document.getElementById("url-input").value
  );
  localStorage.setItem(
    STORAGE_KEYS.MESSAGES,
    JSON.stringify(state.messages)
  );
}


// =====================
// LOAD VIDEO
// =====================
async function loadVideo() {
  const url = document.getElementById("url-input").value.trim();
  if (!url) {
    showStatus("Please paste a YouTube URL first.", "error");
    return;
  }

  showStatus("Loading video transcript...", "loading");
  setLoadButtonDisabled(true);

  try {
    const response = await fetch(`${API_BASE}/video/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Failed to load video.");

    state.videoId = data.video_id;
    saveSession();  // ← persist the video ID

    showStatus(`✓ Video indexed — ${data.chunk_count} chunks ready`, "success");

    clearMessages();
    addMessage("ai", "Video loaded! I've read the full transcript. Ask me anything about it.");

  } catch (error) {
    showStatus(`Error: ${error.message}`, "error");
  } finally {
    setLoadButtonDisabled(false);
  }
}


// =====================
// SEND MESSAGE (with streaming)
// =====================
async function sendMessage() {
  if (!state.videoId) {
    addMessage("ai", "Please load a video first.");
    return;
  }

  const input = document.getElementById("question-input");
  const question = input.value.trim();
  if (!question || state.isLoading) return;

  addMessage("user", question);
  input.value = "";

  const bubbleId = createEmptyAiBubble();
  state.isLoading = true;

  try {
    const answer = await streamResponse(question, bubbleId);
    // Once streaming is done, save the completed answer to history
    const time = getCurrentTime();
    state.messages.push({ role: "ai", text: answer, time });
    saveSession();
  } catch (error) {
    updateBubble(bubbleId, `Sorry, something went wrong: ${error.message}`);
  } finally {
    state.isLoading = false;
    // Remove the streaming cursor
    document.getElementById(`${bubbleId}-text`)?.classList.remove("streaming");
  }
}

async function streamResponse(question, bubbleId) {
  const response = await fetch(`${API_BASE}/chat/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ video_id: state.videoId, question }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Request failed");
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText  = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const rawChunk = decoder.decode(value, { stream: true });
    const lines = rawChunk.split("\n\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const content = line.replace("data: ", "");
      if (content === "[DONE]") break;
      if (content.startsWith("ERROR:")) {
        updateBubble(bubbleId, content.replace("ERROR: ", ""));
        return content;
      }
      fullText += content;
      updateBubble(bubbleId, fullText);
    }
  }

  // Add copy button now that the answer is complete
  addCopyButton(bubbleId, fullText);
  return fullText;
}

function handleEnter(event) {
  if (event.key === "Enter") sendMessage();
}


// =====================
// MESSAGE RENDERING
// =====================

function addMessage(role, text) {
  /*
    Adds a message visually AND saves it to state + localStorage.
    This is the main function called from loadVideo and sendMessage.
  */
  const time = getCurrentTime();

  // Save to state
  state.messages.push({ role, text, time });
  saveSession();

  removeWelcomeMessage();
  renderMessage(role, text, time, true);
}

function renderMessage(role, text, time, isNew) {
  /*
    Pure rendering function — draws the message on screen.
    Does NOT touch state or localStorage.
    Called both when adding new messages AND when restoring from history.

    Separating rendering from state management is a key engineering pattern.
    It means we can re-render the entire chat from saved data without
    accidentally duplicating entries in our state array.
  */
  const messages = document.getElementById("messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;

  const avatarLabel = role === "ai" ? "AI" : "You";

  messageDiv.innerHTML = `
    <div class="avatar ${role}">${avatarLabel}</div>
    <div class="bubble-wrapper">
      <div class="bubble ${role}">${escapeHtml(text)}</div>
      <div class="message-meta">
        <span class="timestamp">${time}</span>
      </div>
    </div>
  `;

  messages.appendChild(messageDiv);
  if (isNew) scrollToBottom();
}

function createEmptyAiBubble() {
  removeWelcomeMessage();
  const messages = document.getElementById("messages");
  const id = "bubble-" + Date.now();

  const messageDiv = document.createElement("div");
  messageDiv.className = "message ai";
  messageDiv.id = id;

  messageDiv.innerHTML = `
    <div class="avatar ai">AI</div>
    <div class="bubble-wrapper">
      <div class="bubble ai streaming" id="${id}-text"></div>
      <div class="message-meta" id="${id}-meta">
        <span class="timestamp">${getCurrentTime()}</span>
      </div>
    </div>
  `;

  messages.appendChild(messageDiv);
  scrollToBottom();
  return id;
}

function updateBubble(id, text) {
  const bubble = document.getElementById(`${id}-text`);
  if (bubble) {
    bubble.innerText = text;
    scrollToBottom();
  }
}

function addCopyButton(bubbleId, text) {
  /*
    After streaming completes, inject a copy button next to the timestamp.
    Clicking it copies the answer to the clipboard.
  */
  const meta = document.getElementById(`${bubbleId}-meta`);
  if (!meta) return;

  const btn = document.createElement("button");
  btn.className = "btn-icon";
  btn.title = "Copy answer";
  btn.innerHTML = "⧉ copy";

  btn.onclick = () => {
    navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = "✓ copied";
      // Reset the button label after 2 seconds
      setTimeout(() => { btn.innerHTML = "⧉ copy"; }, 2000);
    });
  };

  meta.appendChild(btn);
}


// =====================
// CLEAR CHAT
// =====================
function clearChat() {
  /*
    Wipes everything — state, localStorage, and the visual chat.
    The video stays indexed on the server so the user can keep asking
    without re-loading the URL.
  */
  state.messages = [];
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);

  document.getElementById("messages").innerHTML = `
    <div class="welcome-message" id="welcome-message">
      <p>Chat cleared. Ask another question about the loaded video.</p>
    </div>
  `;
}


// =====================
// UTILITY FUNCTIONS
// =====================

function showStatus(message, type) {
  const el = document.getElementById("status-message");
  el.textContent = message;
  el.className = `status-message ${type}`;
  el.classList.remove("hidden");
}

function removeWelcomeMessage() {
  const welcome = document.getElementById("welcome-message");
  if (welcome) welcome.remove();
}

function clearMessages() {
  state.messages = [];
  document.getElementById("messages").innerHTML = "";
}

function scrollToBottom() {
  const chatArea = document.getElementById("chat-area");
  chatArea.scrollTop = chatArea.scrollHeight;
}

function setLoadButtonDisabled(disabled) {
  document.querySelector(".btn-primary").disabled = disabled;
}

function getCurrentTime() {
  /*
    Returns the current time as a readable string like "2:34 PM".
    toLocaleTimeString formats it using the user's local timezone.
  */
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}