import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Remove preferências antigas de tema para que o dashboard sempre inicie no tema claro.
if (typeof window !== 'undefined') {
  const legacyThemeKeys = [
    'bb-hub-theme',
    'bbhub-theme',
    'theme',
    'bgTheme',
    'bb-hub:bg-theme',
    'bbhub:bgTheme',
  ];

  legacyThemeKeys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignora ambientes sem acesso ao localStorage.
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || String(event?.reason || '');
    if (msg.includes('WebSocket') || msg.includes('websocket')) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
