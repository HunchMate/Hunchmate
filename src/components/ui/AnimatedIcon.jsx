import React from 'react';
import Lottie from 'lottie-react';
import { Loader2 } from 'lucide-react';

/**
 * A reusable container for Lottie animations that handles fetching and styling
 * seamlessly for the Neo-Brutalist design language.
 */
export default function AnimatedIcon({ url, animationData, size = 'md', className = '', loop = true }) {
  // Map size prop to actual dimensions
  const sizeMap = {
    xs: 24,
    sm: 48,
    md: 80,
    lg: 120,
    xl: 200,
    full: '100%'
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const style = {
    height: currentSize,
    width: currentSize,
  };

  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(false);

  // Vite ESM interop fix: if Lottie is an object with a default property, use that.
  const LottieComponent = typeof Lottie === 'function' ? Lottie : (Lottie.default || Lottie);

  React.useEffect(() => {
    if (!url || animationData) return;

    let cancelled = false;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;

        // Sanity check: valid Lottie files usually have "v" (version), "fr" (framerate), and "layers"
        if (!json || (!json.v && !json.layers)) {
          throw new Error('Invalid Lottie format received');
        }

        setError(false);
        setData(json);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load Lottie Animation:', err);
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url, animationData]);

  // If a JSON file is passed directly (animationData)
  if (animationData) {
    return (
      <div className={`animated-icon-wrapper ${className}`} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LottieComponent animationData={animationData} loop={loop} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`animated-icon-error ${className}`} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)' }}>
        <Loader2 size={18} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`animated-icon-loading ${className}`} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={18} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className={`animated-icon-wrapper ${className}`} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LottieComponent animationData={data} loop={loop} />
    </div>
  );
}
