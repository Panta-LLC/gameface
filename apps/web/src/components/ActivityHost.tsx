import React from 'react';

type Props = {
  activity: string | null;
  onClose?: () => void;
  // Called when the user picks an activity from the selection view. Pass
  // null to return to selection or to signal clearing.
  onSelect?: (id: string | null) => void;
};

export default function ActivityHost({ activity, onClose, onSelect }: Props) {
  if (!activity) {
    // Selection view: show cards for available activities that fill the
    // available area. Use a header + scrollable body so the gallery takes
    // the full height of the activity column.
    const wrapperStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: 12,
      boxSizing: 'border-box',
      gap: 12,
    };

    const headerStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    };

    const gridStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 12,
      alignContent: 'start',
    };

    const cardStyle: React.CSSProperties = {
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      padding: 12,
      background: '#fff',
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      minHeight: 150,
      alignItems: 'flex-end',
    };

    return (
      <div style={wrapperStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>Activities</h3>
          <div style={{ color: '#666', fontSize: 13 }}>Select an activity</div>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <div style={gridStyle}>
            <button style={cardStyle} onClick={() => onSelect?.('card-table')}>
              <h4>Card Table</h4>
              <p>Play card games with friends.</p>
            </button>
            <button style={cardStyle} onClick={() => onSelect?.('trivia')}>
              <h4>Trivia</h4>
              <p>Host a quick trivia session.</p>
            </button>
            <button style={cardStyle} onClick={() => onSelect?.('whiteboard')}>
              <h4>Whiteboard</h4>
              <p>Collaborative drawing and notes.</p>
            </button>
            <button style={cardStyle} onClick={() => onSelect?.('custom')}>
              <h4>Custom</h4>
              <p>Other activity types.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Minimal placeholder UIs matching general style
  const commonStyle: React.CSSProperties = {
    height: 'calc(100% - 61px)',
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
    background: '#ffffff',
    // border: '2px solid #e0e0e0',
    position: 'relative',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  };

  const closeBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#666',
  };

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
    <div style={commonStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0 }}>Activity: {activity}</h3>
        {onClose && (
          <button aria-label="Close activity" style={closeBtnStyle} onClick={onClose}>
            ×
          </button>
        )}
      </div>
      <div>{content}</div>
    </div>
  );
}
