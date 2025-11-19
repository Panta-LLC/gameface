import './VideoCall.css';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SignalingClient from '../webrtc/SignalingClient';
import ActivityHost from './ActivityHost';
import type { SignalingClientLike } from './card-table/types';
import LocalVideoModule from './LocalVideoModule';
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
  // optional layout override for activity rendering. When set to
  // 'video-top' and the active activity is the card-table, remote
  // videos will be shown across the top and the game board rendered
  // below it.
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
  // Manage peer connections per-remote-id for mesh calls (N>2)
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [myId, setMyId] = useState<string | null>(null);
  const myIdRef = useRef<string | null>(null);
  // Buffer incoming offers that arrive before we receive our welcome id.
  const pendingOffersRef = useRef<any[]>([]);
  const signalingRef = useRef<SignalingClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // Initialize signaling once (defined later, moved to avoid use-before-assign lint)

  // Create a new peer connection for a remote peer id. If isInitiator is true
  // the caller will normally create an offer and send it.
  const createPeerConnection = useCallback((remoteId: string) => {
    if (pcsRef.current.has(remoteId)) return pcsRef.current.get(remoteId)!;
    const pc = new RTCPeerConnection(rtcConfig);
    console.debug('[PC] createPeerConnection for', remoteId);

    // Debug: track initial transceiver/sender counts
    try {
      console.debug(
        '[PC] initial senders:',
        pc.getSenders().length,
        'receivers:',
        pc.getReceivers().length,
        'transceivers:',
        pc.getTransceivers().length,
      );
    } catch (_e) {
      /* no-op: best-effort diagnostics */
    }

    // Ensure transceivers exist so negotiation includes recv/send sections even
    // if local tracks aren't attached yet (helps prevent negotiation stalls).
    try {
      pc.addTransceiver('video', { direction: 'sendrecv' });
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    } catch (_e) {
      // addTransceiver may not be supported in all browsers; ignore if it fails
      /* no-op */
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const payload = { type: 'candidate', candidate: e.candidate };
        console.log('[Signaling][send] candidate ->', remoteId, payload);
        signalingRef.current?.sendMessage(payload);
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    pc.ontrack = (e) => {
      // Some browsers/platforms may not include the full MediaStream in
      // `event.streams`. In those cases construct a MediaStream from the
      // provided track so downstream code can always rely on a stream object.
      const stream = (e.streams && e.streams[0]) || new MediaStream([e.track]);
      try {
        console.debug(
          '[PC] ontrack for',
          remoteId,
          'streams length',
          (e.streams && e.streams.length) || 0,
        );
      } catch (_e) {
        /* no-op */
      }
      // Use remoteId as the key so we can remove the video when the peer leaves
      setRemoteStreams((prev) => {
        // If we already have a stream object for this peer and it's the same
        // object, avoid updating state to prevent unnecessary re-renders.
        if (prev[remoteId] === stream) return prev;
        // If a video element already exists for this peer id, attach immediately
        const el = remoteVideoRefs.current[remoteId];
        if (el && el.srcObject !== stream) el.srcObject = stream;
        return { ...prev, [remoteId]: stream };
      });
    };

    // If we already have a local stream, add its tracks to the new peer connection
    if (localStreamRef.current) {
        try {
          console.debug(
            '[PC] adding local tracks to pc for',
            remoteId,
            'tracks:',
            localStreamRef.current.getTracks().map((t) => t.kind),
          );
          localStreamRef.current.getTracks().forEach((t) => {
            try {
              const sender = pc.addTrack(t, localStreamRef.current!);
              console.debug(
                '[PC] added track',
                t.kind,
                'sender track id:',
                sender?.track?.id ?? '(no id)',
              );
            } catch (_e) {
              console.warn('[PC] addTrack failed for', t.kind, _e);
            }
          });
          try {
            console.debug(
              '[PC] after addTrack senders:',
              pc.getSenders().map((s) => ({ id: s.track?.id, kind: s.track?.kind })),
              'transceivers:',
              pc.getTransceivers().map((t) => ({ mid: t.mid, direction: t.direction })),
            );
          } catch (_e) {
            /* no-op */
          }
        } catch (_e) {
          console.warn('Failed to add local tracks to new PC', _e);
        }
    }

    pcsRef.current.set(remoteId, pc);
    return pc;
  }, []);

  // Ensure local tracks are added to a PC (call after startLocal if needed)
  const ensureLocalTracks = useCallback((pc: RTCPeerConnection) => {
    if (!localStreamRef.current) return;
      try {
        console.debug(
          '[PC] ensureLocalTracks before:',
          pc.getSenders().map((s) => ({ id: s.track?.id, kind: s.track?.kind })),
        );
        const hasSendersWithTrack = pc.getSenders().some((s) => !!s.track);
        if (!hasSendersWithTrack) {
          console.debug('[PC] no senders with tracks detected — adding local tracks');
          localStreamRef.current.getTracks().forEach((t) => {
            try {
              const sender = pc.addTrack(t, localStreamRef.current!);
              console.debug(
                '[PC] ensureLocalTracks added',
                t.kind,
                'sender track id:',
                sender?.track?.id ?? '(no id)',
              );
            } catch (_e) {
              console.warn('ensureLocalTracks addTrack failed', _e);
            }
          });
        }
        try {
          console.debug(
            '[PC] ensureLocalTracks after:',
            pc.getSenders().map((s) => ({ id: s.track?.id, kind: s.track?.kind })),
            'receivers:',
            pc.getReceivers().map((r) => ({ id: r.track?.id, kind: r.track?.kind })),
          );
        } catch (_e) {
          /* no-op */
        }
      } catch (_e) {
        console.warn('ensureLocalTracks error', _e);
      }
  }, []);

  // Helper: close and remove a peer connection and its associated stream/video
  const removePeer = useCallback((remoteId: string) => {
    const pc = pcsRef.current.get(remoteId);
    if (pc) {
      try {
        pc.getSenders().forEach((s) => {
          try {
            s.track?.stop();
          } catch {}
        });
      } catch {}
      try {
        pc.close();
      } catch {}
      pcsRef.current.delete(remoteId);
    }
    // remove stream entry
    setRemoteStreams((prev) => {
      if (!(remoteId in prev)) return prev;
      const copy = { ...prev };
      delete copy[remoteId];
      return copy;
    });
    // remove DOM ref
    if (remoteVideoRefs.current[remoteId]) {
      try {
        const el = remoteVideoRefs.current[remoteId];
        if (el && el.srcObject) {
          try {
            (el.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
          } catch {}
        }
      } catch {}
      delete remoteVideoRefs.current[remoteId];
    }
  }, []);

  const startLocal = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream =
        initialStream ?? (await navigator.mediaDevices.getUserMedia({ video: true, audio: true }));
      localStreamRef.current = stream;
      console.debug(
        '[Local] startLocal -> got stream',
        stream.id,
        'tracks:',
        stream.getTracks().map((t) => t.kind),
      );
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (e) {
      console.error('Failed to access local media', e);
      setError('Failed to access camera or microphone.');
      throw e;
    }
  }, [initialStream]);

  // Process an incoming offer with polite/impolite glare handling per the
  // perfect-negotiation pattern. We implement a deterministic polite rule
  // (higher numeric id is polite) so both sides agree on who should yield.
  const processIncomingOffer = useCallback(
    async (msg: any) => {
      const origin = msg.id ? String(msg.id) : null;
      if (!origin || origin === myIdRef.current) return;
      const pc = pcsRef.current.get(origin) ?? createPeerConnection(origin);
      if (!localStreamRef.current) await startLocal();
      ensureLocalTracks(pc);

      // Deterministic polite selection: the peer with the larger numeric id
      // will be considered polite and will accept incoming offers during
      // collisions.
      const polite = myIdRef.current ? Number(myIdRef.current) > Number(origin) : true;
      const offerCollision = makingOffer || pc.signalingState !== 'stable';
      const ignoreOffer = !polite && offerCollision;
      if (ignoreOffer) {
        console.warn('[Signaling] ignoring offer due to collision and impolite role', origin);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signalingRef.current?.sendMessage({ type: 'answer', sdp: pc.localDescription });
      } catch (e) {
        console.error('Failed to handle offer from', origin, e);
      }
    },
    [createPeerConnection, ensureLocalTracks, startLocal, makingOffer],
  );

  // Initialize signaling once (after helpers are defined)
  useEffect(() => {
    const signaling = new SignalingClient(SIGNALING_URL);
    signalingRef.current = signaling;
    // expose adapter for card-table consumers
    setCardSignaling({
      send: (msg: any) => signaling.sendMessage(msg),
      on: (h: any) => signaling.onMessage(h),
    });

    // Message handler for multi-peer mesh. Server will include 'id' on
    // offer/answer/candidate messages and will send a 'welcome' with our id
    // on join.
    const unsub = signaling.onMessage(async (msg: any) => {
      console.log('[Signaling][recv]', msg);
      try {
        switch (msg.type) {
          case 'welcome': {
            if (msg.id) {
              const id = String(msg.id);
              setMyId(id);
              myIdRef.current = id;
              // Drain any offers that arrived before we learned our id
              if (pendingOffersRef.current.length) {
                const pending = pendingOffersRef.current.splice(0);
                for (const p of pending) {
                  try {
                    await processIncomingOffer(p);
                  } catch (e) {
                    console.warn('Failed to process pending offer', e);
                  }
                }
              }
            }
            break;
          }
          case 'peer-joined': {
            // Another peer joined — create a PC and initiate an offer to them
            const remoteId = String(msg.id);
            if (!remoteId || remoteId === myIdRef.current) break;
            const pc = createPeerConnection(remoteId);
            // Ensure local stream is available and was added by createPeerConnection
            if (!localStreamRef.current) await startLocal();
            // make sure local tracks are attached to this pc (race fix)
            ensureLocalTracks(pc);
            try {
              setMakingOffer(true);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              signalingRef.current?.sendMessage({ type: 'offer', sdp: pc.localDescription });
            } catch (e) {
              console.error('Failed to create/send offer to', remoteId, e);
            } finally {
              setMakingOffer(false);
            }
            break;
          }
          case 'offer': {
            // Incoming offer from remote peer (msg.id is their id)
            // If we haven't yet learned our id, buffer the offer until welcome arrives
            if (!myIdRef.current) {
              pendingOffersRef.current.push(msg);
              console.debug('[Signaling] buffered offer until welcome id received', msg.id);
              break;
            }
            await processIncomingOffer(msg);
            break;
          }
          case 'answer': {
            const responder = msg.id ? String(msg.id) : null;
            if (!responder || responder === myIdRef.current) break;
            const pc = pcsRef.current.get(responder);
            if (pc && msg.sdp) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              } catch (e) {
                console.error('Failed to set remote description for answer from', responder, e);
              }
            }
            break;
          }
          case 'candidate': {
            const sender = msg.id ? String(msg.id) : null;
            if (!sender || sender === myIdRef.current) break;
            let pc = pcsRef.current.get(sender);
            // If we don't yet have a PC for this sender, create one so we can
            // attach the candidate. This handles candidates arriving before
            // the offer/answer handshake completes on some networks.
            if (!pc) {
              pc = createPeerConnection(sender);
              if (!localStreamRef.current) await startLocal();
              ensureLocalTracks(pc);
            }
            if (pc && msg.candidate) {
              try {
                await pc.addIceCandidate(msg.candidate);
              } catch (e) {
                console.warn('addIceCandidate failed for', sender, e);
              }
            }
            break;
          }
          case 'peer-left': {
            const left = msg.id ? String(msg.id) : null;
            if (!left) break;
            removePeer(left);
            break;
          }
          default:
            break;
        }
      } catch (e) {
        console.error('Error handling signaling message', e);
        setError('Failed to handle signaling message.');
      }
    });

    return () => {
      try {
        unsub();
      } catch {}
      signaling.close();
      setCardSignaling(null);
    };
  }, [createPeerConnection, removePeer, startLocal]);

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
    // Join the room. Existing peers will initiate offers to us; we only
    // prepare our local stream so it can be attached to new peer connections
    // when they are created.
    console.log('[Action] join requested — acquiring local media first', { room });
    setJoined(true);
    setConnectionState('connecting');
    await startLocal();
    console.log('[Signaling][send] join', { room });
    signalingRef.current.sendMessage({ type: 'join', room });
  }, [room, startLocal]);

  const leave = useCallback(() => {
    setJoined(false);
    signalingRef.current?.sendMessage({ type: 'leave' });
    // Close and remove all peer connections
    try {
      for (const [id, pc] of Array.from(pcsRef.current.entries())) {
        try {
          pc.getSenders().forEach((s) => {
            try {
              s.track?.stop();
            } catch {}
          });
        } catch {}
        try {
          pc.close();
        } catch {}
        pcsRef.current.delete(id);
      }
    } catch (e) {
      console.warn('Error closing peer connections', e);
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

  // Overlay visibility state per-remote: true when we should show the play/unmute
  // control (e.g. remote is present but playback isn't progressing or is muted).
  const [remoteOverlay, setRemoteOverlay] = useState<Record<string, boolean>>({});
  const overlayHandlersRef = useRef<Record<string, () => void>>({});

  // Attach event listeners to remote <video> elements so we can auto-show the
  // overlay when playback isn't progressing (paused / waiting / no data) or
  // when the element is muted. We clean up listeners when streams are removed.
  useEffect(() => {
    const ids = Object.keys(remoteStreams);
    // Add listeners for new ids
    ids.forEach((id) => {
      const el = remoteVideoRefs.current[id];
      if (!el || overlayHandlersRef.current[id]) {
        // initialize state anyway
        try {
          const show = el
            ? el.paused || el.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA || el.muted
            : false;
          setRemoteOverlay((p) => (p[id] === show ? p : { ...p, [id]: show }));
        } catch {}
        return;
      }

      const update = () => {
        try {
          const show = el.paused || el.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA || el.muted;
          setRemoteOverlay((prev) => (prev[id] === show ? prev : { ...prev, [id]: show }));
        } catch (e) {
          console.warn('overlay update error', e);
        }
      };

      overlayHandlersRef.current[id] = update;
      el.addEventListener('playing', update);
      el.addEventListener('pause', update);
      el.addEventListener('waiting', update);
      el.addEventListener('stalled', update);
      el.addEventListener('loadeddata', update);
      el.addEventListener('volumechange', update);
      // initialize
      update();
    });

    // Cleanup handlers for ids that were removed
    Object.keys(overlayHandlersRef.current).forEach((id) => {
      if (!ids.includes(id)) {
        const el = remoteVideoRefs.current[id];
        const h = overlayHandlersRef.current[id];
        try {
          if (el && h) {
            el.removeEventListener('playing', h);
            el.removeEventListener('pause', h);
            el.removeEventListener('waiting', h);
            el.removeEventListener('stalled', h);
            el.removeEventListener('loadeddata', h);
            el.removeEventListener('volumechange', h);
          }
        } catch {}
        delete overlayHandlersRef.current[id];
        setRemoteOverlay((prev) => {
          if (!(id in prev)) return prev;
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }
    });

    return () => {
      // remove all listeners on unmount
      Object.keys(overlayHandlersRef.current).forEach((id) => {
        const el = remoteVideoRefs.current[id];
        const h = overlayHandlersRef.current[id];
        try {
          if (el && h) {
            el.removeEventListener('playing', h);
            el.removeEventListener('pause', h);
            el.removeEventListener('waiting', h);
            el.removeEventListener('stalled', h);
            el.removeEventListener('loadeddata', h);
            el.removeEventListener('volumechange', h);
          }
        } catch {}
      });
      overlayHandlersRef.current = {};
    };
  }, [remoteStreams]);

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

  // Layout state: default to 'video-top' when user enters card-table, else default.
  const [layoutState, setLayoutState] = useState<'default' | 'video-top'>(
    activity === 'card-table' ? 'video-top' : 'default',
  );

  // Only apply the automatic default when the activity changes so we don't stomp a
  // user's manual toggle while they're interacting.
  const prevActivityRef = useRef<string | null>(activity);
  useEffect(() => {
    if (prevActivityRef.current !== activity) {
      if (activity === 'card-table') setLayoutState('video-top');
      else setLayoutState('default');
      prevActivityRef.current = activity;
    }
  }, [activity]);

  const mainClass = `vc-main ${activity ? 'has-activity' : ''} ${
    activity === 'card-table' && layoutState === 'video-top' ? 'video-top' : ''
  }`;

  return (
    <div className="vc-container">
      {/* Debug panel: shows my assigned id and remote count to help diagnose connection issues */}
      <div
        className="vc-debug"
        style={{
          position: 'fixed',
          right: 12,
          top: 12,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '6px 8px',
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        <div>myId: {myId ?? '—'}</div>
        <div>joined: {String(joined)}</div>
        <div>conn: {connectionState}</div>
        <div>remotes: {Object.keys(remoteStreams).length}</div>
      </div>
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
      <div className={mainClass}>
        <div className={`activity-wrapper open`}>
          <ActivityHost
            activity={activity ?? null}
            signalingClient={cardSignaling}
            layout={layoutState}
            setLayout={setLayoutState}
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
                  muted
                  playsInline
                />
                <div className="vc-remote-overlay">
                  <button
                    className={'vc-unmute-btn ' + (remoteOverlay[id] ? 'visible' : 'hidden')}
                    onClick={() => {
                      const el = remoteVideoRefs.current[id];
                      if (!el) return;
                      try {
                        // Toggle play / pause & mute state. If paused, play and
                        // unmute. If playing, pause and mute.
                        if (el.paused) {
                          el.muted = false;
                          const p = el.play();
                          if (p && typeof p.then === 'function')
                            p.catch((e) => console.warn('play() rejected', e));
                          setRemoteOverlay((p) => ({ ...p, [id]: false }));
                        } else {
                          el.pause();
                          el.muted = true;
                          setRemoteOverlay((p) => ({ ...p, [id]: true }));
                        }
                      } catch (e) {
                        console.warn('Failed to toggle remote video', e);
                      }
                    }}
                    aria-label={(() => {
                      const el = remoteVideoRefs.current[id];
                      if (!el) return 'Play remote video';
                      if (el.paused) return 'Play and unmute remote';
                      if (el.muted) return 'Unmute remote';
                      return 'Pause and mute remote';
                    })()}
                    title={(() => {
                      const el = remoteVideoRefs.current[id];
                      if (!el) return 'Play remote video';
                      if (el.paused) return 'Play and unmute remote';
                      if (el.muted) return 'Unmute remote';
                      return 'Pause and mute remote';
                    })()}
                  >
                    {/* Speaker icon with optional slash (muted) and small play badge when paused */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M5 9v6h4l5 5V4L9 9H5z" fill="currentColor" />
                      {/* volume waves when unmuted */}
                      {(() => {
                        const el = remoteVideoRefs.current[id];
                        const showWaves = el && !el.muted && !el.paused && el.readyState >= 2;
                        if (showWaves) {
                          return (
                            <path
                              d="M16.5 8.5a4 4 0 010 7"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              fill="none"
                            />
                          );
                        }
                        return null;
                      })()}
                      {(() => {
                        const el = remoteVideoRefs.current[id];
                        const isMuted = el ? el.muted : true;
                        if (isMuted) {
                          return <path d="M2 2l20 20" stroke="currentColor" strokeWidth="1.5" />;
                        }
                        return null;
                      })()}
                    </svg>
                    {/* small play badge when paused */}
                    {(() => {
                      const el = remoteVideoRefs.current[id];
                      if (el && el.paused) {
                        return (
                          <svg
                            className="vc-unmute-badge"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path d="M6 4l14 8-14 8V4z" fill="currentColor" />
                          </svg>
                        );
                      }
                      return null;
                    })()}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom toolbar: contains local video (left), room/status (center), and actions (right) */}
      <div className="vc-bottom-toolbar" role="toolbar" aria-label="session toolbar">
        <div className="vc-bottom-left">
          {localStream && (
            <div className="vc-local-slot">
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
            </div>
          )}
        </div>
        <div className="vc-bottom-center">
          <div className="vc-session-status">
            Room: {room} • {connectionState}
          </div>
        </div>
        <div className="vc-bottom-right">
          {/* Placeholder for future actions (mute all, settings, leave) */}
          <button className="vc-action" onClick={() => leave()} aria-label="Leave room">
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
