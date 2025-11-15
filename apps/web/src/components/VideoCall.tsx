import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SignalingClient from '../webrtc/SignalingClient';
import './VideoCall.css';

const SIGNALING_URL = 'ws://localhost:3001';

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

type Props = { room: string };

export default function VideoCall({ room }: Props) {
  const [joined, setJoined] = useState(false);
  const [makingOffer, setMakingOffer] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

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
      // Track stream and bind to element if already mounted
      setRemoteStreams((prev) => {
        if (prev[stream.id]) return prev;
        // If a video element already exists for this id, attach immediately
        const el = remoteVideoRefs.current[stream.id];
        if (el && el.srcObject !== stream) el.srcObject = stream;
        return { ...prev, [stream.id]: stream };
      });
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
    // Clear remote refs and streams
    Object.values(remoteVideoRefs.current).forEach((el) => {
      if (el) el.srcObject = null;
    });
    setRemoteStreams({});
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setConnectionState('disconnected');
    setMakingOffer(false);
  }, []);

  const remoteStreamEntries = useMemo(() => Object.entries(remoteStreams), [remoteStreams]);

  // Ensure streams are attached to DOM elements whenever either side changes
  useEffect(() => {
    for (const [id, stream] of Object.entries(remoteStreams)) {
      const el = remoteVideoRefs.current[id];
      if (el && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    }
  }, [remoteStreams]);

  return (
    <div className="vc-container">
      <div className="vc-controls">
        <div>Connection: {connectionState}</div>
        {error && <div className="vc-error">{error}</div>}
        <div className="vc-controls-row">
          <div>
            <strong>Room:</strong> {room}
          </div>
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
            {isCameraOff ? 'Camera On' : 'Camera Off'}
          </button>
        </div>
      </div>

      {/* Remote videos across the top */}
      <div className="vc-remote-strip">
        {remoteStreamEntries.length === 0 && (
          <div className="vc-remote-placeholder">Waiting for peers…</div>
        )}
        {remoteStreamEntries.map(([id]) => (
          <div className="vc-remote-tile" key={id}>
            <video
              ref={(el) => {
                remoteVideoRefs.current[id] = el;
                const stream = remoteStreams[id];
                if (el && stream && el.srcObject !== stream) {
                  el.srcObject = stream;
                }
              }}
              autoPlay
              playsInline
            />
          </div>
        ))}
      </div>

      {/* Local video pinned bottom-left */}
      <div className="vc-local-pin">
        <video ref={localVideoRef} autoPlay playsInline muted />
      </div>
    </div>
  );
}
