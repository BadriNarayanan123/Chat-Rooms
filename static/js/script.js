// // Actions:

// const closeButton = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
// <title>remove</title>
// <path d="M27.314 6.019l-1.333-1.333-9.98 9.981-9.981-9.981-1.333 1.333 9.981 9.981-9.981 9.98 1.333 1.333 9.981-9.98 9.98 9.98 1.333-1.333-9.98-9.98 9.98-9.981z"></path>
// </svg>
// `;
// const menuButton = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
// <title>ellipsis-horizontal</title>
// <path d="M16 7.843c-2.156 0-3.908-1.753-3.908-3.908s1.753-3.908 3.908-3.908c2.156 0 3.908 1.753 3.908 3.908s-1.753 3.908-3.908 3.908zM16 1.98c-1.077 0-1.954 0.877-1.954 1.954s0.877 1.954 1.954 1.954c1.077 0 1.954-0.877 1.954-1.954s-0.877-1.954-1.954-1.954z"></path>
// <path d="M16 19.908c-2.156 0-3.908-1.753-3.908-3.908s1.753-3.908 3.908-3.908c2.156 0 3.908 1.753 3.908 3.908s-1.753 3.908-3.908 3.908zM16 14.046c-1.077 0-1.954 0.877-1.954 1.954s0.877 1.954 1.954 1.954c1.077 0 1.954-0.877 1.954-1.954s-0.877-1.954-1.954-1.954z"></path>
// <path d="M16 31.974c-2.156 0-3.908-1.753-3.908-3.908s1.753-3.908 3.908-3.908c2.156 0 3.908 1.753 3.908 3.908s-1.753 3.908-3.908 3.908zM16 26.111c-1.077 0-1.954 0.877-1.954 1.954s0.877 1.954 1.954 1.954c1.077 0 1.954-0.877 1.954-1.954s-0.877-1.954-1.954-1.954z"></path>
// </svg>
// `;

// const actionButtons = document.querySelectorAll('.action-button');

// if (actionButtons) {
//   actionButtons.forEach(button => {
//     button.addEventListener('click', () => {
//       const buttonId = button.dataset.id;
//       let popup = document.querySelector(`.popup-${buttonId}`);
//       console.log(popup);
//       if (popup) {
//         button.innerHTML = menuButton;
//         return popup.remove();
//       }

//       const deleteUrl = button.dataset.deleteUrl;
//       const editUrl = button.dataset.editUrl;
//       button.innerHTML = closeButton;

//       popup = document.createElement('div');
//       popup.classList.add('popup');
//       popup.classList.add(`popup-${buttonId}`);
//       popup.innerHTML = `<a href="${editUrl}">Edit</a>
//       <form action="${deleteUrl}" method="delete">
//         <button type="submit">Delete</button>
//       </form>`;
//       button.insertAdjacentElement('afterend', popup);
//     });
//   });
// }

// Menu

const dropdownMenu = document.querySelector(".dropdown-menu");
const dropdownButton = document.querySelector(".dropdown-button");

if (dropdownButton) {
  dropdownButton.addEventListener("click", () => {
    dropdownMenu.classList.toggle("show");
  });
}

// Upload Image
const photoInput = document.querySelector("#avatar");
const photoPreview = document.querySelector("#preview-avatar");
if (photoInput)
  photoInput.onchange = () => {
    const [file] = photoInput.files;
    if (file) {
      photoPreview.src = URL.createObjectURL(file);
    }
  };

// Scroll to Bottom
const conversationThread = document.querySelector(".room__box");
if (conversationThread) conversationThread.scrollTop = conversationThread.scrollHeight;

document.addEventListener("DOMContentLoaded", () => {
  const configEl = document.getElementById("room-config");
  const roomName = configEl.dataset.roomId;
  const username = configEl.dataset.username;

  const chatSocket = new WebSocket(
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
  window.location.hostname +
  ":8000/ws/room/" + roomName + '/'
);

  const messageInput = document.querySelector('#chat-message-input');
  const typingIndicator = document.querySelector('#typing-indicator');
  const threads = document.querySelector(".threads");
  let typingTimeout = null;

  chatSocket.onopen = () => console.log("✅ WebSocket connected");
  chatSocket.onerror = (e) => console.error("❌ WebSocket error", e);
  chatSocket.onclose = () => console.warn("⚠️ WebSocket closed");

  // Receiving messages
  chatSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    if (data.event === "cooldown") 
    {
      messageInput.disabled = true;
      typingIndicator.innerText = `Please wait ${data.seconds} seconds before sending again...`;
      setTimeout(() => {
        messageInput.disabled = false;
        typingIndicator.innerText = "";
        }, data.seconds * 1000);
    }

    if(data.event == "join") 
    {
        addParticipant(data.username);
        if(username != data.username)
          showSystemMessage(`@${data.username} joined the room`);
        data.username.forEach(u => {
        const badge = document.querySelector(`.status-badge[data-username="${u}"]`);
        if(badge) 
        {
          badge.textContent = "🟢";
        }
      });
    }
    else if(data.event == "leave") 
    {
      removeParticipant(data.username);
      showSystemMessage(`@${data.username} left the room`);
      const badge = document.querySelector(`.status-badge[data-username="${data.username}"]`);
      if(badge) 
      {
        badge.textContent = "⚪";
      }
    }


    if (data.event === "typing") {
      if (data.username !== username) {   // only show others
          if (data.typing) {
            typingIndicator.innerText = `${data.username} is typing...`;
          } else {
                typingIndicator.innerText = "";   // clear when false
    }
  }
}

    else if (data.message) 
    {
      // Only append when there is an actual message
      threads.innerHTML += `
        <div class="thread">
          <div class="thread__top">
            <div class="thread__author">
              <span>@${data.username}</span>
              <span class="thread__date">just now</span>
            </div>
          </div>
          <div class="thread__details">
            ${data.message}
          </div>
        </div>
      `;
    }
  };

  // Handle message form
  const chatForm = document.querySelector("#chat-form");
  chatForm.onsubmit = function(e) {
    e.preventDefault();
    const message = messageInput.value;

    if (chatSocket.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify({
        "message": message,
        "username": username
      }));
    } else {
      console.error("❌ WebSocket not open");
    }

    messageInput.value = "";
  };

  // --- Typing indicator logic ---
  messageInput.addEventListener('input', function() {
    if (chatSocket.readyState !== WebSocket.OPEN) return;
    console.log("Hello typing in pursuit");

    chatSocket.send(JSON.stringify({ typing: true }));

    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      chatSocket.send(JSON.stringify({ typing: false }));
    }, 1000);
  });
  function addParticipant(_username) {
  const participantsList = document.querySelector('#participants');
  const userEl = document.createElement('div');
  userEl.classList.add('participant');
  userEl.setAttribute('data-username', _username);
  if(username != _username)
  userEl.innerText = _username;
  else userEl.innerText = '';
  participantsList.appendChild(userEl);
}

function removeParticipant(username) {
  const participantsList = document.querySelector('#participants');
  const userEl = participantsList.querySelector(`[data-username="${username}"]`);
  if (userEl) userEl.remove();
}
function showSystemMessage(text) {
  const threads = document.querySelector(".threads");
  const systemMsg = document.createElement("div");
  systemMsg.classList.add("system-message");
  systemMsg.innerText = text;

  threads.appendChild(systemMsg);

  // Remove after 5 seconds
  setTimeout(() => {
    systemMsg.remove();
  }, 5000);
}

});

//Load more messages button logic 
let currentPage = 1;
const messagesList = document.querySelector(".threads");
const loadMoreBtn = document.querySelector("#load-more");
const roomId = document.getElementById("room-config").dataset.roomId;
const jwtEl = document.getElementById("jwt-config");
const accessToken = jwtEl.dataset.access;
const refreshToken = jwtEl.dataset.refresh;
console.log("Access Token:", accessToken);

function fetchMessages(page) {
  console.log(roomId);
  fetch(`/room/${roomId}/messages/?page=${page}`,{
    method: "GET",
  headers: {
    "Authorization": "Bearer " + accessToken,
    "Content-Type": "application/json"
  }
  })
    .then(response => response.json())
    .then(data => {
      data.messages.reverse().forEach(msg => {
        const threadDiv = document.createElement("div");
        threadDiv.classList.add("thread");

        threadDiv.innerHTML = `
          <div class="thread__top">
            <div class="thread__author">
              <a href="/profile/${msg.user_id}" class="thread__authorInfo">
                <div class="avatar avatar--small">
                  <img src="${msg.avatar_url}" />
                </div>
                <span>@${msg.username}</span>
              </a>
              <span class="thread__date">${msg.created}</span>
            </div>
            ${msg.can_delete ? `
              <a href="/delete-message/${msg.id}">
                <div class="thread__delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    <title>remove</title>
                    <path d="M27.314 6.019l-1.333-1.333-9.98 9.981-9.981-9.981-1.333 1.333 
                    9.981 9.981-9.981 9.98 1.333 1.333 9.981-9.98 
                    9.98 9.98 1.333-1.333-9.98-9.98 9.98-9.981z">
                    </path>
                  </svg>
                </div>
              </a>
            ` : ""}
          </div>
          <div class="thread__details">
            ${msg.body}
          </div>
        `;

        messagesList.prepend(threadDiv);
      });

      if (!data.has_next) {
        loadMoreBtn.style.display = "none";
      }
    });
}


// On button click → load next page
loadMoreBtn.addEventListener("click", () => {
  currentPage++;
  fetchMessages(currentPage);
});







