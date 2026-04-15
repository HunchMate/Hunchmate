import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 'var(--space-8)',
      background: 'var(--color-primary-light)',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '8rem',
        fontWeight: 700,
        background: 'var(--gradient-primary)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        lineHeight: 1,
      }}>404</h1>
      <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)', color: 'var(--color-text-heading)' }}>
        Signal Lost
      </h2>
      <p style={{
        color: 'var(--color-text-secondary)',
        maxWidth: '400px',
        margin: '0 auto var(--space-8)',
      }}>
        The page you're looking for has drifted into the void. Let's get you back on track.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
        <Link to="/"><Button variant="primary" icon={Home}>Return Home</Button></Link>
        <Link to="/events"><Button variant="secondary" icon={ArrowLeft}>Event Arena</Button></Link>
      </div>
    </div>
  );
}
