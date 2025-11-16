import React from 'react';

type Props = {
  activity: string | null;
  onClose?: () => void;
};

export default function ActivityHost({ activity, onClose }: Props) {
  if (!activity) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          height: 360,
          background: '#f3f3f3',
          border: '2px dashed #ccc',
          borderRadius: 12,
          marginTop: 12,
        }}
      >
        <div>No activity selected. Use the sidebar to choose one.</div>
      </div>
    );
  }

  // Minimal placeholder UIs matching general style
  const commonStyle: React.CSSProperties = {
    height: 360,
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
    background: '#ffffff',
    border: '2px solid #e0e0e0',
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
