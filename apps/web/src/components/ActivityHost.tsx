import React from 'react';
import './ActivityHost.css';

type Props = {
  activity: string | null;
  onClose?: () => void;
  // Called when the user picks an activity from the selection view. Pass
  // null to return to selection or to signal clearing.
  onSelect?: (id: string | null) => void;
};

export default function ActivityHost({ activity, onClose, onSelect }: Props) {
  if (!activity) {
    return (
      <div className="ah-wrapper">
        <div className="ah-header">
          <h3 className="ah-title">Activities</h3>
          <div className="ah-sub">Select an activity</div>
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
              <p>Collaborative drawing and notes.</p>
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
        return <div>Card Table – placeholder stage</div>;
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
      <div className="pb-8">
        <button className="ah-back-btn" onClick={() => onSelect?.(null)}>
          ← Back to Activity Selection
        </button>
      </div>
      <div className="ah-landing-header">
        <h3 className="ah-title">Activity: {activity}</h3>
        {/* Provide an explicit "Back to selection" control rather than a generic close
            so the user can clearly return to the selection grid. This uses onSelect
            to clear the current activity. */}
      </div>

      <div className="ah-landing-content">{content}</div>
    </div>
  );
}
