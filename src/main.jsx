import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import AppShell from './AppShell.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')).render(
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppShell />
    </GoogleOAuthProvider>
  ) : (
    <AppShell />
  ),
)
