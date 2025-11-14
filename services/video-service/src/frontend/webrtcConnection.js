const signalingServerUrl = 'http://localhost:3000';
const socket = io(signalingServerUrl);

const localConnection = new RTCPeerConnection();
const remoteConnection = new RTCPeerConnection();

socket.on('offer', async ({ sender, offer }) => {
  await remoteConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await remoteConnection.createAnswer();
  await remoteConnection.setLocalDescription(answer);
  socket.emit('answer', { target: sender, answer });
});

socket.on('answer', async ({ answer }) => {
  await localConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async ({ candidate }) => {
  const iceCandidate = new RTCIceCandidate(candidate);
  await localConnection.addIceCandidate(iceCandidate);
});

localConnection.onicecandidate = ({ candidate }) => {
  if (candidate) {
    socket.emit('ice-candidate', { target: 'remote-id', candidate });
  }
};

localConnection.ontrack = ({ streams }) => {
  const remoteVideo = document.getElementById('remoteVideo');
  remoteVideo.srcObject = streams[0];
};

const startCall = async () => {
  const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const localVideo = document.getElementById('localVideo');
  localVideo.srcObject = localStream;

  localStream.getTracks().forEach((track) => {
    localConnection.addTrack(track, localStream);
  });

  const offer = await localConnection.createOffer();
  await localConnection.setLocalDescription(offer);
  socket.emit('offer', { target: 'remote-id', offer });
};

export { startCall };
