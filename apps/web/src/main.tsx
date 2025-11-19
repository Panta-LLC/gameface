import './index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { ThemeProvider } from './components/theme-provider';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
