'use client';

import { useNavigate } from '@/utils/router';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import '@/vite-pages/NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <section className="nf-page">
      <div className="nf-container">
        {/* Animated 404 GIF background box */}
        <div className="nf-gif-box" aria-hidden="true">
          <h1 className="nf-number">404</h1>
        </div>

        {/* Text + CTA */}
        <div className="nf-content">
          <h2 className="nf-title">Looks like you're lost</h2>
          <p className="nf-subtitle">
            The page you are looking for has drifted into the void.
          </p>

          <div className="nf-actions">
            <Button
              variant="primary"
              icon={Home}
              size="lg"
              onClick={() => navigate('/')}
            >
              Go to Home
            </Button>
            <Button
              variant="secondary"
              icon={ArrowLeft}
              size="lg"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
