import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { startAutoSync } from './lib/queue';
// Latin-ext covers Polish (ą, ę, ł…); Cyrillic covers Ukrainian. Browsers only download the subsets a page uses.
import '@fontsource/laila/latin-600.css'; // English headings, as on laaha.org
import '@fontsource/laila/latin-700.css';
import '@fontsource/arima/latin-600.css';
import '@fontsource/arima/latin-700.css';
import '@fontsource/arima/latin-ext-600.css';
import '@fontsource/arima/latin-ext-700.css';
import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/latin-600.css';
import '@fontsource/noto-sans/latin-700.css';
import '@fontsource/noto-sans/latin-ext-400.css';
import '@fontsource/noto-sans/latin-ext-600.css';
import '@fontsource/noto-sans/latin-ext-700.css';
import '@fontsource/noto-sans/cyrillic-400.css';
import '@fontsource/noto-sans/cyrillic-600.css';
import '@fontsource/noto-sans/cyrillic-700.css';
import 'leaflet/dist/leaflet.css';
import './styles.css';

startAutoSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
