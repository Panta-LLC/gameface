import React, { useState } from 'react';

type Props = {
  onGranted: (args: { name: string; stream: MediaStream }) => void;
};

export default function AuthGate({ onGranted }: Props) {
  const [name, setName] = useState('Player');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const continueWithPermissions = async () => {
    setError(null);
    setPending(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      onGranted({ name: name.trim() || 'Player', stream });
    } catch (e) {
      const err = e as Error | undefined;
      setError(err?.message || 'Failed to access camera/microphone.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
      <h2>Welcome</h2>
      <label>
        Display name
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ marginLeft: 8 }} />
      </label>
      <button onClick={continueWithPermissions} disabled={pending}>
        {pending ? 'Requesting permissions…' : 'Continue'}
      </button>
      {error && <div style={{ color: '#b00020' }}>{error}</div>}
      <small>We only use your camera/mic for the live session. Nothing is recorded.</small>
    </div>
  );
}
