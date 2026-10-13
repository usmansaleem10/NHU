import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/app';
import { initServices } from './app/services';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root element missing from index.html');

await initServices();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
