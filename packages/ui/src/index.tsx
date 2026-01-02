import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { ErrorBoundary } from './common/error/ErrorBoundary';
import './app/styles/global.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container missing in index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary contextLabel="app">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

