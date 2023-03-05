const chatForm = document.getElementById("message-form");
const btnLocation = document.getElementById("send-location");
const formInput = document.getElementById("chatbox");
const btnSend = document.querySelector("form button");
const messages = document.getElementById("messages");

// Templates
const messageTemplate = document.getElementById("message-template").innerHTML;
const locationTemplate = document.getElementById(
  "location-msg-template"
).innerHTML;
const sidebarTemplate = document.getElementById("sidebar-template").innerHTML;

// Options
const { room, username } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

const autoScroll = () => {
  // New message element
  const newMessageEl = messages.lastElementChild;

  // New message height
  const newMessageStyles = getComputedStyle(newMessageEl);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = newMessageEl.offsetHeight + newMessageMargin;

  // Visible height
  const visibleHeight = messages.offsetHeight;

  // Height of messages container
  const containerHeight = messages.scrollHeight;

  // How far has been scrolled
  const scrollOffset = messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    messages.scrollTop = messages.scrollHeight;
  }

  // Most of the code was to determine wether we are at the bottom or not to prevent yanking downward on every new message
};

socket.on("message", (msg) => {
  const html = Mustache.render(messageTemplate, {
    username: msg.username,
    message: msg.text,
    createdAt: moment(msg.createdAt).format("H:mm"),
  });
  messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

socket.on("locationMessage", (locationUrl) => {
  const html = Mustache.render(locationTemplate, {
    username: locationUrl.username,
    locationUrl: locationUrl.url,
    createdAt: moment(locationUrl.createdAt).format("H:mm"),
  });
  messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  document.getElementById("sidebar").innerHTML = html;
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  btnSend.setAttribute("disabled", "disabled");

  const userMsg = formInput.value;
  socket.emit("sendMessage", userMsg, (error) => {
    btnSend.removeAttribute("disabled");
    formInput.value = "";
    formInput.focus();

    if (error) {
      return console.log(error);
    }
  });
});

btnLocation.addEventListener("click", (e) => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser");
  }

  btnLocation.setAttribute("disabled", "disabled");

  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        btnLocation.removeAttribute("disabled");
      }
    );
  });
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
