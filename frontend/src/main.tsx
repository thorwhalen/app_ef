/**
 * App entry point — mount the React tree.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installE2EBridge } from './e2e/bridge';
import './index.css';

// Expose the command registry on `window` for end-to-end tests. DEV-only:
// the `import.meta.env.DEV` guard is statically `false` in a production
// build, so this call — and `installE2EBridge` with it — is eliminated.
if (import.meta.env.DEV) {
  installE2EBridge();
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
