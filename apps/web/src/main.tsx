import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installAudioUnlock } from './lib/audioUnlock';

// Unlock audio on the first user gesture so the news anchor isn't silent
// until a page refresh (autoplay policy).
installAudioUnlock();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
