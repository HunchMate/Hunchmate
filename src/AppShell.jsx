import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

export default function AppShell() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  )
}