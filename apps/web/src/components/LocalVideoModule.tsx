import './LocalVideoModule.css';

import { MicrophoneIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React from 'react';

type Props = {
  localStream: MediaStream | null | undefined;
  isMuted: boolean;
  setIsMuted: (v: boolean) => void;
  isCameraOff: boolean;
  toggleCamera: () => void;
  // session controls
  joined: boolean;
  join: () => Promise<void> | void;
  leave: () => void;
};

export default function LocalVideoModule({
  localStream,
  isMuted,
  setIsMuted,
  isCameraOff,
  toggleCamera,
  joined,
  join,
  leave,
}: Props) {
  return (
    <div className="local-video-pin">
      <video
        className="local-video-element"
        autoPlay
        muted
        playsInline
        ref={(v) => {
          if (v && localStream) v.srcObject = localStream;
        }}
      />
      <div className="local-video-actions" role="toolbar" aria-orientation="horizontal">
        <div>
          <button
            className="action-btn mr-2"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-pressed={isMuted}
            onClick={() => setIsMuted(!isMuted)}
            disabled={!joined}
          >
            <span className="icon-wrap">
              <MicrophoneIcon className="action-icon" />
              {isMuted && <XMarkIcon className="icon-overlay" />}
            </span>
          </button>
          <button
            className="action-btn"
            title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
            aria-pressed={isCameraOff}
            onClick={toggleCamera}
            disabled={!joined}
          >
            <span className="icon-wrap">
              <VideoCameraIcon className="action-icon" />
              {isCameraOff && <XMarkIcon className="icon-overlay" />}
            </span>
          </button>
        </div>

        <div className="session-controls">
          {!joined ? (
            <button className="session-btn connect" onClick={() => join()}>
              Connect
            </button>
          ) : (
            <button className="session-btn leave" onClick={leave}>
              Leave
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
