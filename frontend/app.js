// app.js — the entire frontend logic

// =====================
// STATE
// A place to remember things between function calls.
// Without this, every function would have to re-read the DOM.
// =====================
const state = {
  videoId: null,      // set after a video is successfully loaded
  isLoading: false,   // prevents sending two requests at once
};

// The API base URL. When you deploy, change this to your server URL.
const API_BASE = "http://localhost:8000";


// =====================
// STEP 1: LOAD VIDEO
// Called when user clicks "Load video"
// =====================
async function loadVideo() {
  const url = document.getElementById("url-input").value.trim();

  // Guard: don't proceed if the box is empty
  if (!url) {
    showStatus("Please paste a YouTube URL first.", "error");
    return;
  }

  // Show the user something is happening
  showStatus("Loading video transcript...", "loading");
  setLoadButtonDisabled(true);

  try {
    /*
      fetch() sends an HTTP request — just like your browser does
      when it loads a webpage, but we control what it sends.

      method: "POST" — we're sending data, not just requesting a page
      headers: tells the server we're sending JSON
      body: the actual data, converted to a JSON string
    */
    const response = await fetch(`${API_BASE}/video/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url }),
    });

    /*
      await means "pause here until the server responds".
      Without await, the code would continue before the response arrives.
    */
    const data = await response.json();

    if (!response.ok) {
      // response.ok is false if the status code is 400, 500, etc.
      throw new Error(data.detail || "Failed to load video.");
    }

    // Success — save the video ID and update the UI
    state.videoId = data.video_id;

    showStatus(
      `✓ Video indexed — ${data.chunk_count} chunks ready`,
      "success"
    );

    // Clear the welcome message and show a greeting
    clearMessages();
    addMessage("ai", "Video loaded! I've read the full transcript. Ask me anything about it.");

  } catch (error) {
    // Network error, server error, invalid video — all land here
    showStatus(`Error: ${error.message}`, "error");
  } finally {
    // finally runs no matter what — success OR error
    // Always re-enable the button when done
    setLoadButtonDisabled(false);
  }
}


// =====================
// STEP 2: SEND A MESSAGE
// Called when user clicks Send or presses Enter
// =====================
async function sendMessage() {
  // Guard: no video loaded yet
  if (!state.videoId) {
    addMessage("ai", "Please load a video first before asking questions.");
    return;
  }

  const input = document.getElementById("question-input");
  const question = input.value.trim();

  // Guard: empty message
  if (!question) return;

  // Guard: already waiting for a response
  if (state.isLoading) return;

  // Show the user's message in the chat
  addMessage("user", question);

  // Clear the input box
  input.value = "";

  // Show the typing animation while waiting
  const typingId = showTypingIndicator();
  state.isLoading = true;

  try {
    const response = await fetch(`${API_BASE}/chat/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: state.videoId,
        question: question,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to get answer.");
    }

    // Remove the typing dots and show the real answer
    removeTypingIndicator(typingId);
    addMessage("ai", data.answer);

  } catch (error) {
    removeTypingIndicator(typingId);
    addMessage("ai", `Sorry, something went wrong: ${error.message}`);
  } finally {
    state.isLoading = false;
  }
}


// =====================
// ENTER KEY SUPPORT
// Lets user press Enter instead of clicking Send
// =====================
function handleEnter(event) {
  // event.key tells us which key was pressed
  if (event.key === "Enter") {
    sendMessage();
  }
}


// =====================
// UI HELPER FUNCTIONS
// Small functions that update specific parts of the page.
// Keeping these separate makes the main functions cleaner.
// =====================

function addMessage(role, text) {
  /*
    Dynamically creates a new message element and adds it to the chat.
    role is either "ai" or "user".

    We're building this HTML string:
    <div class="message ai">
      <div class="avatar ai">AI</div>
      <div class="bubble ai">text here</div>
    </div>
  */
  const messages = document.getElementById("messages");

  // Remove the welcome message if it exists
  const welcome = messages.querySelector(".welcome-message");
  if (welcome) welcome.remove();

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;

  const avatarLabel = role === "ai" ? "AI" : "You";

  messageDiv.innerHTML = `
    <div class="avatar ${role}">${avatarLabel}</div>
    <div class="bubble ${role}">${escapeHtml(text)}</div>
  `;

  messages.appendChild(messageDiv);

  // Auto-scroll to the newest message
  scrollToBottom();
}

function showTypingIndicator() {
  /*
    Adds the animated dots to the chat.
    Returns an ID so we can find and remove it later.
  */
  const messages = document.getElementById("messages");
  const id = "typing-" + Date.now(); // unique ID

  const typingDiv = document.createElement("div");
  typingDiv.className = "message ai";
  typingDiv.id = id;

  typingDiv.innerHTML = `
    <div class="avatar ai">AI</div>
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;

  messages.appendChild(typingDiv);
  scrollToBottom();
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function showStatus(message, type) {
  // type is "success", "error", or "loading"
  const el = document.getElementById("status-message");
  el.textContent = message;
  el.className = `status-message ${type}`; // applies the right color
  el.classList.remove("hidden");
}

function clearMessages() {
  document.getElementById("messages").innerHTML = "";
}

function scrollToBottom() {
  const chatArea = document.getElementById("chat-area");
  chatArea.scrollTop = chatArea.scrollHeight;
}

function setLoadButtonDisabled(disabled) {
  // Find the "Load video" button and enable/disable it
  document.querySelector(".btn-primary").disabled = disabled;
}

function escapeHtml(text) {
  /*
    Security: never insert raw user text directly into innerHTML.
    If text contains <script>alert('hacked')</script>,
    innerHTML would execute it. This function neutralizes that.
    This is called XSS prevention — important to know for interviews.
  */
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}