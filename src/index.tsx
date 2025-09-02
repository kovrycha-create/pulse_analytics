import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HealthProvider } from './hooks/useHealth';
import './index.css';
import { initTheme } from './theme';

// initialize theme early
try { initTheme(); } catch (e) { /* ignore */ }

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HealthProvider>
      <App />
    </HealthProvider>
  </React.StrictMode>
);