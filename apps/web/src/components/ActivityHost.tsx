import React from 'react';

type Props = {
  activity: string | null;
};

export default function ActivityHost({ activity }: Props) {
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
  };

  switch (activity) {
    case 'card-table':
      return <div style={commonStyle}>Card Table – placeholder stage</div>;
    case 'trivia':
      return <div style={commonStyle}>Trivia – placeholder stage</div>;
    case 'whiteboard':
      return <div style={commonStyle}>Whiteboard – placeholder stage</div>;
    default:
      return <div style={commonStyle}>Unknown activity: {activity}</div>;
  }
}
