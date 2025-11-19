import './Toast.css';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastMessage = {
  id: string;
  text: string;
  type?: 'info' | 'success' | 'error';
};

type ToastContextValue = {
  push: (text: string, type?: ToastMessage['type'], ttl?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const push = useCallback((text: string, type: ToastMessage['type'] = 'info', ttl = 4000) => {
    const id = Math.random().toString(36).slice(2, 9);
    const t = { id, text, type } as ToastMessage;
    setToasts((s) => [t, ...s]);
    window.setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id));
    }, ttl);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return ctx.push;
}

export default ToastProvider;
