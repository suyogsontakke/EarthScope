import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress harmless ResizeObserver loop notifications thrown by browser rendering engines
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message && (
      e.message.includes('ResizeObserver loop completed with undelivered notifications') ||
      e.message.includes('ResizeObserver loop limit exceeded')
    )) {
      e.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
