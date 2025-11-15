import React, { useCallback, useEffect, useRef, useState } from 'react';
import SignalingClient from '../webrtc/SignalingClient';

const SIGNALING_URL = 'ws://localhost:3001';

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function VideoCall() {
  const [room, setRoom] = useState('room1');
  const [joined, setJoined] = useState(false);
  const [makingOffer, setMakingOffer] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize signaling once (defined later, moved to avoid use-before-assign lint)

  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const payload = { type: 'candidate', candidate: e.candidate };
        console.log('[Signaling][send]', payload);
        signalingRef.current?.sendMessage(payload);
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    // Drive initial offer creation when tracks are added
    pc.onnegotiationneeded = async () => {
      try {
        setMakingOffer(true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const payload = { type: 'offer', sdp: pc.localDescription };
        console.log('[Signaling][send]', payload);
        signalingRef.current?.sendMessage(payload);
      } catch (e) {
        console.error('Negotiation failed', e);
        setError('Negotiation failed while creating an offer.');
      } finally {
        setMakingOffer(false);
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (e) {
      console.error('Failed to access local media', e);
      setError('Failed to access camera or microphone.');
      throw e;
    }
  }, []);

  // Initialize signaling once (after helpers are defined)
  useEffect(() => {
    const signaling = new SignalingClient(SIGNALING_URL);
    signalingRef.current = signaling;

    signaling.onMessage(async (msg) => {
      console.log('[Signaling][recv]', msg);
      // Ensure a peer connection exists before handling messages
      const pc = pcRef.current ?? ensurePC();

      try {
        switch (msg.type) {
          case 'offer': {
            // Prepare local if not already started
            if (!localStreamRef.current) {
              const stream = await startLocal();
              stream.getTracks().forEach((t) => pc.addTrack(t, stream));
            }
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
        }
      } catch (e) {
        console.error('Error handling signaling message', e);
        setError('Failed to handle signaling message.');
      }
    });

    return () => {
      signaling.close();
    };
    // Create PC early so we don't miss early offers and wire events once
    ensurePC();
  }, [ensurePC, startLocal]);

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  const join = useCallback(async () => {
    if (!signalingRef.current) return;
    const pc = ensurePC();
    // Join the room BEFORE adding tracks to avoid offers being sent before the server maps the socket to the room
    console.log('[Signaling][send] join', { room });
    signalingRef.current.sendMessage({ type: 'join', room });
    setJoined(true);
    setConnectionState('connecting');
    const stream = await startLocal();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  }, [ensurePC, room, startLocal]);

  const leave = useCallback(() => {
    setJoined(false);
    signalingRef.current?.sendMessage({ type: 'leave' });

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch {}
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
    setConnectionState('disconnected');
    setMakingOffer(false);
  }, []);

  return (
    <div style={{ marginTop: 24 }}>
      <h2>Video Call</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div>Connection State: {connectionState}</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>
          Room:
          <input value={room} onChange={(e) => setRoom(e.target.value)} style={{ marginLeft: 8 }} />
        </label>
        <button onClick={join} disabled={joined}>
          Connect
        </button>
        <button onClick={leave} disabled={!joined}>
          Leave
        </button>
        <button onClick={toggleMute} disabled={!joined}>
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={toggleCamera} disabled={!joined}>
          {isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <div>
          <div>Local</div>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: 240, background: '#000' }}
          />
        </div>
        <div>
          <div>Remote</div>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: 240, background: '#000' }}
          />
        </div>
      </div>
    </div>
  );
}
