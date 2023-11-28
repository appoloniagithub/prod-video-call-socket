"use strict";

//Defining some global utility variables
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;
//let userStream;
//Initialize turn/stun server here
var pcConfig = turnConfig;

var localStreamConstraints = {
  audio: true,
  video: true,
};

//Not prompting for room name
//var room = 'foo';

// Prompting for room name:
//var room = prompt('Enter room name:');

//Initializing socket.io
var socket = io.connect();
//var socket = io("https://socket.appoloniaapp.com:7055/chat");
const toggleButton = document.getElementById("toggle-cam");
const toggleOff = document.getElementById("toggle-off");
const audioButton = document.getElementById("audio-button");
const audioOff = document.getElementById("audio-off");
console.log(room, "room in main.js file");

if (room !== "") {
  socket.emit("create or join", room);
  console.log("Attempted to create or  join room", room);
}

//Defining socket connections for signalling
socket.on("created", function (room) {
  console.log("Created room " + room);
  isInitiator = true;
});

socket.on("full", function (room) {
  console.log("Room " + room + " is full");
});

socket.on("join", function (room) {
  console.log("Another peer made a request to join room " + room);
  console.log("This peer is the initiator of room " + room + "!");
  isChannelReady = true;
});

socket.on("joined", function (room) {
  console.log("joined: " + room);
  isChannelReady = true;
});

socket.on("log", function (array) {
  console.log.apply(console, array);
});

//Driver code
socket.on("message", function (message, room) {
  console.log("Client received message:", message, room);
  if (message === "got user media") {
    maybeStart();
  } else if (message.type === "offer") {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === "answer" && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === "candidate" && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate,
    });
    pc.addIceCandidate(candidate);
  } else if (message === "bye" && isStarted) {
    handleRemoteHangup();
    //hangup();
  }
});

//Function to send message in a room
function sendMessage(message, room) {
  console.log("Client sending message: ", message, room);
  socket.emit("message", message, room);
}

//Displaying Local Stream and Remote Stream on webpage
var localVideo = document.querySelector("#localVideo");
var remoteVideo = document.querySelector("#remoteVideo");
var localvideo_max = document.querySelector("#localvideo_max")
const hangupButton = document.getElementById("hangupButton");
console.log("Going to find Local media");
navigator.mediaDevices
  .getUserMedia(localStreamConstraints)
  .then(gotStream)
  .catch(function (e) {
    alert("getUserMedia() error: " + e.name);
  });

//If found local stream
function gotStream(stream) {
  console.log("Adding local stream.");
  localStream = stream;
  localVideo.srcObject = stream;
  localvideo_max.srcObject = stream;
  sendMessage("got user media", room);
  if (isInitiator) {
    maybeStart();
  }
}

console.log("Getting user media with constraints", localStreamConstraints);

//If initiator, create the peer connection
function maybeStart() {
  console.log(">>>>>>> maybeStart() ", isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== "undefined" && isChannelReady) {
    console.log(">>>>>> creating peer connection");
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log("isInitiator", isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

//Sending bye if user closes the window
window.onbeforeunload = function () {
  sendMessage("bye", room);
};

//Creating peer connection
function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log("Created RTCPeerConnnection");
  } catch (e) {
    console.log("Failed to create PeerConnection, exception: " + e.message);
    alert("Cannot create RTCPeerConnection object.");
    return;
  }
}

//Function to handle Ice candidates
function handleIceCandidate(event) {
  console.log("icecandidate event: ", event);
  if (event.candidate) {
    sendMessage(
      {
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      },
      room
    );
  } else {
    console.log("End of candidates.");
  }
}

function handleCreateOfferError(event) {
  console.log("createOffer() error: ", event);
}

function doCall() {
  console.log("Sending offer to peer");
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log("Sending answer to peer.");
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log("setLocalAndSendMessage sending message", sessionDescription);
  sendMessage(sessionDescription, room);
}

function onCreateSessionDescriptionError(error) {
  trace("Failed to create session description: " + error.toString());
}

function handleRemoteStreamAdded(event) {
  console.log("Remote stream added.");
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
  var localdiv_min = document.getElementById("div1")
  var localdiv_max = document.getElementById("div1_local")
  var remotediv = document.getElementById("div2")
  localdiv_min.classList.remove("d-none");
  localdiv_min.classList.add("d-block");
  localdiv_max.classList.remove("d-block");
  localdiv_max.classList.add("d-none");
  remotediv.classList.remove("d-none");
  remotediv.classList.add("d-block");
}

function handleRemoteStreamRemoved(event) {
  console.log("Remote stream removed. Event: ", event);
}

function hangup() {
  console.log("Hanging up.");
  const videoContainer = document.getElementById("video_display");
  const videostop = document.getElementById("stop");
  videoContainer.classList.remove("d-block");
  videoContainer.classList.add("d-none");
  videostop.classList.add("d-block");
  videostop.classList.remove("d-none");
  stop();
  sendMessage("bye", room);
}

function handleRemoteHangup() {
  console.log("Session terminated.");
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  console.log(pc, "pc");
  if (pc) {
    pc.close();
  }
  pc = null;
}

// toggleButton.addEventListener("click", () => {
//   const videoTrack = localStream
//     .getTracks()
//     .find((track) => track.kind === "video");
//   if (videoTrack.enabled) {
//     videoTrack.enabled = false;
//     // document.getElementById("toggle-cam");
//     toggleButton.innerHTML = "Show cam";
//   } else {
//     videoTrack.enabled = true;
//     toggleButton.innerHTML = "Hide cam";
//     //document.getElementById("toggle-off");
//   }
// });

// audioButton.addEventListener("click", () => {
//   const audioTrack = localStream
//     .getTracks()
//     .find((track) => track.kind === "audio");
//   if (audioTrack.enabled) {
//     audioTrack.enabled = false;
//     // document.getElementById("audio-button");
//     audioButton.innerHTML = "Mute";
//   } else {
//     audioTrack.enabled = true;
//     audioButton.innerHTML = "Unmute";
//     // document.getElementById("audio-off");
//     // toggleOff;
//   }
// });

toggleOff.addEventListener("click", () => {
  toggleOff.classList.remove("d-block");
  toggleOff.classList.add("d-none");
  toggleButton.classList.remove("d-none");
  toggleButton.classList.add("d-block");
  const videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === "video");
  videoTrack.enabled = true;
});

toggleButton.addEventListener("click", () => {
  toggleButton.classList.remove("d-block");
  toggleButton.classList.add("d-none");
  toggleOff.classList.remove("d-none");
  toggleOff.classList.add("d-block");
  const videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === "video");
  videoTrack.enabled = false;
});

audioButton.addEventListener("click", () => {
  audioButton.classList.remove("d-block");
  audioButton.classList.add("d-none");
  audioOff.classList.remove("d-none");
  audioOff.classList.add("d-block");
  const audioTrack = localStream
    .getTracks()
    .find((track) => track.kind === "audio");
  audioTrack.enabled = false;
});

audioOff.addEventListener("click", () => {
  audioOff.classList.remove("d-block");
  audioOff.classList.add("d-none");
  audioButton.classList.remove("d-none");
  audioButton.classList.add("d-block");
  const audioTrack = localStream
    .getTracks()
    .find((track) => track.kind === "audio");
  audioTrack.enabled = true;
});
