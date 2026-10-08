import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './styles/production-menu.css';
import './styles/figma-fidelity.css';
import './styles/other-conferences.css';
import './styles/responsive-components.css';
import './styles/experience.css';
import './styles/motion.css';
import './styles/hero-scene.css';
import './styles/ticket-offer.css';
import './styles/buttons.css';
import './styles/fluid-experience.css';
import './styles/partner-review.css';
import './styles/art-director.css';
import './styles/cosmic-motion.css';
import './styles/exhibition.css';
import './styles/conference-partners.css';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
