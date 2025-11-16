import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SignalingClientLike } from './card-table/types';
import SignalingClient from '../webrtc/SignalingClient';
import LocalVideoModule from './LocalVideoModule';
import ActivityHost from './ActivityHost';
import './VideoCall.css';
import { useToast } from './Toast';

const SIGNALING_URL = 'ws://localhost:3001';

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

type Props = {
  room: string;
  initialStream?: MediaStream;
  localStream?: MediaStream;
  // activity state is owned at a higher level (App) and passed down so the
  // sidebar and the video UI stay in sync.
  activity?: string | null;
  // selection handler expects a non-null activity id when selecting an
  // activity; clearing/closing can be handled by passing an explicit
  // 'clear' action if needed (or by the parent calling select(null) if
  // supported).
  onSelectActivity?: (id: string | null) => void;
};

export default function VideoCall({
  room,
  initialStream,
  localStream,
  activity = null,
  onSelectActivity,
}: Props) {
  // activity selection is always visible in the activity column by default
  const [joined, setJoined] = useState(false);
  const [makingOffer, setMakingOffer] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

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
      const stream =
        initialStream ?? (await navigator.mediaDevices.getUserMedia({ video: true, audio: true }));
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (e) {
      console.error('Failed to access local media', e);
      setError('Failed to access camera or microphone.');
      throw e;
    }
  }, [initialStream]);

  // Initialize signaling once (after helpers are defined)
  useEffect(() => {
    const signaling = new SignalingClient(SIGNALING_URL);
    signalingRef.current = signaling;
    // expose adapter for card-table consumers
    setCardSignaling({
      send: (msg: any) => signaling.sendMessage(msg),
      on: (h: any) => signaling.onMessage(h),
    });

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
      setCardSignaling(null);
    };
    // Create PC early so we don't miss early offers and wire events once
    ensurePC();
  }, [ensurePC, startLocal]);

  useEffect(() => {
    startLocal().catch((e) => {
      console.error('Failed to initialize local stream on mount', e);
    });
  }, [startLocal]);

  // Surface errors to users via toast and keep inline error display
  useEffect(() => {
    if (error) {
      try {
        toast(error, 'error');
      } catch (e) {
        // if toast not available for some reason, still log
        console.error('toast error', e);
      }
    }
  }, [error, toast]);

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) {
      console.error('toggleCamera: No local stream available');
      return;
    }
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) {
      console.error('toggleCamera: No video track available');
      return;
    }
    console.log('toggleCamera: Toggling video track. Current state:', videoTrack.enabled);
    videoTrack.enabled = !videoTrack.enabled;
    setIsCameraOff(!videoTrack.enabled);
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

  // Activity ownership is lifted to App; use the prop value here.
  // `onSelectActivity` is called by UI controls to change the activity.

  // Ensure streams are attached to DOM elements whenever either side changes
  useEffect(() => {
    for (const [id, stream] of Object.entries(remoteStreams)) {
      const el = remoteVideoRefs.current[id];
      if (el && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    }
  }, [remoteStreams]);

  // Signaling adapter state — exposed to activity hosts once the underlying
  // SignalingClient is constructed so `on` can return a real unsubscribe.
  const [cardSignaling, setCardSignaling] = useState<SignalingClientLike | null>(null);

  return (
    <div className="vc-container">
      {/* <div className="vc-controls">
        <div>Connection: {connectionState}</div>
      </div> */}
      {error && <div className="vc-error">{error}</div>}
      {/*<div className="vc-controls-row">
          <div>
            <strong>Room:</strong> {room}
          </div>
        </div>
      </div> */}

      {/* Remote videos across the top */}
      <div className={`vc-main ${activity ? 'has-activity' : ''}`}>
        <div className={`activity-wrapper open`}>
          <ActivityHost
            activity={activity ?? null}
            signalingClient={cardSignaling}
            onClose={() => {
              onSelectActivity?.(null);
              // keep activity gallery visible
            }}
            onSelect={(id) => {
              if (id) {
                onSelectActivity?.(id);
                // activity selected — gallery remains accessible via landing view
              } else {
                onSelectActivity?.(null);
                // no-op: remain in selection/gallery state
              }
            }}
          />
        </div>
        <div className="vc-remote-area">
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
          {localStream && (
            <LocalVideoModule
              localStream={localStream}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              isCameraOff={isCameraOff}
              toggleCamera={toggleCamera}
              joined={joined}
              join={join}
              leave={leave}
            />
          )}
        </div>
      </div>
    </div>
  );
}
