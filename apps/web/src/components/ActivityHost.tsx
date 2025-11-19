import './ActivityHost.css';

import React from 'react';

import CardTableHost from './card-table/CardTableHost';
import type { SignalingClientLike } from './card-table/types';

type Props = {
  activity: string | null;
  onClose?: () => void;
  // Called when the user picks an activity from the selection view. Pass
  // null to return to selection or to signal clearing.
  onSelect?: (id: string | null) => void;
  // Optional signaling client adapter forwarded to activity hosts that need
  // cross-client coordination (e.g. card table).
  signalingClient?: SignalingClientLike | null;
  // layout controls provided by the parent so the activity header can
  // expose a toggle to switch between layouts at runtime.
  layout?: 'default' | 'video-top';
  setLayout?: (l: 'default' | 'video-top') => void;
  // When false, ActivityHost will not render the header toolbar — used when
  // the surrounding app supplies a global toolbar (e.g. bottom toolbar).
  showHeader?: boolean;
};

export default function ActivityHost({
  activity,
  onClose: _onClose,
  onSelect,
  signalingClient,
  layout = 'default',
  setLayout,
  showHeader = true,
}: Props) {
  if (!activity) {
    return (
      <div className="ah-wrapper">
        <div className="ah-header">
          <h3 className="ah-title">Activities</h3>
          {/* <div className="ah-sub">Select an activity</div> */}
        </div>

        <div className="ah-body">
          <div className="ah-grid">
            <button className="ah-card" onClick={() => onSelect?.('card-table')}>
              <h4>Card Table</h4>
              <p>Play card games with friends.</p>
            </button>
            <button className="ah-card" onClick={() => onSelect?.('trivia')}>
              <h4>Trivia</h4>
              <p>Host a quick trivia session.</p>
            </button>
            <button className="ah-card" onClick={() => onSelect?.('whiteboard')}>
              <h4>Whiteboard</h4>
              <p>Collaborative drawing.</p>
            </button>
            <button className="ah-card" onClick={() => onSelect?.('custom')}>
              <h4>Custom</h4>
              <p>Other activity types.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Minimal placeholder UIs matching general style
  // landing / running activity styles are driven by CSS classes in
  // ActivityHost.css so the panel can fill available space and provide
  // consistent spacing and focus states.

  const content = (() => {
    switch (activity) {
      case 'card-table':
        return <CardTableHost signalingClient={signalingClient} />;
      case 'trivia':
        return <div>Trivia – placeholder stage</div>;
      case 'whiteboard':
        return <div>Whiteboard – placeholder stage</div>;
      default:
        return <div>Unknown activity: {activity}</div>;
    }
  })();

  return (
    <div className="ah-landing">
      {showHeader && (
        <>
          <div className="pb-8">
            <button className="ah-back-btn" onClick={() => onSelect?.(null)}>
              ← Back to Activity Selection
            </button>
          </div>
          <div className="ah-landing-header">
            <h3 className="ah-title">Activity: {activity}</h3>
            {/* Layout toggle (only shown for card-table activity) */}
            {activity === 'card-table' && setLayout && (
              <div>
                <button
                  className="ah-layout-toggle"
                  onClick={() => setLayout(layout === 'video-top' ? 'default' : 'video-top')}
                  aria-pressed={layout === 'video-top'}
                >
                  {layout === 'video-top' ? 'Videos top' : 'Videos side'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="ah-landing-content">{content}</div>
    </div>
  );
}
