import React, { useCallback, useEffect, useRef, useState } from 'react';
import SignalingClient from '../webrtc/SignalingClient';

const SIGNALING_URL = 'ws://localhost:3001';

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export default function VideoCall() {
  const [room, setRoom] = useState('room1');
  const [joined, setJoined] = useState(false);
  const [makingOffer, setMakingOffer] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize signaling once
  useEffect(() => {
    const signaling = new SignalingClient(SIGNALING_URL);
    signalingRef.current = signaling;

    signaling.onMessage(async (msg) => {
      // console.log('[signaling] msg', msg);
      if (!pcRef.current) return;
      const pc = pcRef.current;

      try {
        switch (msg.type) {
          case 'offer': {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            signalingRef.current?.sendMessage({ type: 'answer', sdp: pc.localDescription });
            break;
          }
          case 'answer': {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            break;
          }
          case 'candidate': {
            if (msg.candidate) {
              await pc.addIceCandidate(msg.candidate);
            }
            break;
          }
          case 'peer-joined': {
            // Optionally, auto-start as caller if we are already joined
            break;
          }
          case 'peer-left': {
            // remote left; keep simple for now
            break;
          }
        }
      } catch (e) {
        console.error('Error handling signaling message', e);
      }
    });

    return () => {
      signaling.close();
    };
  }, []);

  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalingRef.current?.sendMessage({ type: 'candidate', candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    return pc;
  }, []);

  const startLocal = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  const join = useCallback(async () => {
    if (!signalingRef.current) return;
    const pc = ensurePC();
    const stream = await startLocal();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    signalingRef.current.sendMessage({ type: 'join', room });
    setJoined(true);
  }, [ensurePC, room, startLocal]);

  const startCall = useCallback(async () => {
    const pc = ensurePC();
    try {
      setMakingOffer(true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signalingRef.current?.sendMessage({ type: 'offer', sdp: pc.localDescription });
    } catch (e) {
      console.error('Failed to start call', e);
    } finally {
      setMakingOffer(false);
    }
  }, [ensurePC]);

  const leave = useCallback(() => {
    setJoined(false);
    signalingRef.current?.sendMessage({ type: 'leave' });

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => {
        try { s.track?.stop(); } catch {}
      });
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  return (
    <div style={{ marginTop: 24 }}>
      <h2>Video Call</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>
          Room:
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>
        <button onClick={join} disabled={joined}>Join</button>
        <button onClick={startCall} disabled={!joined || makingOffer}>Start Call</button>
        <button onClick={leave} disabled={!joined}>Leave</button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <div>
          <div>Local</div>
          <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 240, background: '#000' }} />
        </div>
        <div>
          <div>Remote</div>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 240, background: '#000' }} />
        </div>
      </div>
    </div>
  );
}
