import React, { useEffect } from 'react';
import './ActivityPanel.css';

type Props = {
  activityId: string | null;
  onClose: () => void;
};

export default function ActivityPanel({ activityId, onClose }: Props) {
  useEffect(() => {
    if (!activityId) return;
    // Simulate loading activity resources (placeholder)
    console.log('Loading activity', activityId);
  }, [activityId]);

  if (!activityId) return null;

  return (
    <aside className="activity-panel" aria-hidden={activityId ? 'false' : 'true'}>
      <div className="activity-header">
        <h3 className="activity-title">Activity: {activityId}</h3>
        <button className="activity-close" onClick={onClose} aria-label="Close activity">
          ×
        </button>
      </div>

      <div className="activity-body">
        {/* Replace with real activity loader/render logic */}
        <p>
          Activity content for <strong>{activityId}</strong> would load here.
        </p>
      </div>
    </aside>
  );
}
