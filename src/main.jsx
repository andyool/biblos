import { createRoot } from 'react-dom/client';

import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cinzel-decorative/latin-400.css';
import '@fontsource/cinzel-decorative/latin-700.css';
import '@fontsource/pinyon-script/latin-400.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import '@fontsource/im-fell-english/latin-400.css';
import '@fontsource/im-fell-english/latin-400-italic.css';

import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/lesson.css';
import './styles/reading.css';

import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { registerServiceWorker } from './lib/update.js';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// Handy for testing in development: window.__biblos.setState(...)
if (import.meta.env.DEV) {
  import('./lib/store.js').then(({ getState, setState }) => {
    window.__biblos = { getState, setState };
  });
}

registerServiceWorker();
