import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

// Préserver le routage pour Supabase (Implicit flow).
// Redirige la racine vers /reset-password si un hash de type "recovery" est détecté
// AVANT même l'initialisation de React Router et de Supabase Client.
if (window.location.hash.includes('type=recovery') && window.location.pathname === '/') {
  window.history.replaceState(null, '', '/reset-password' + window.location.search + window.location.hash);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
