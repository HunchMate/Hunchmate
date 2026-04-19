import { memo, useMemo } from 'react'
import Grainient from './Grainient'

const GrainyGradient = memo(function GrainyGradient() {
  // Detect mobile and motion preferences for performance
  const isMobile = useMemo(() => window.innerWidth < 768, [])
  const prefersReducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  
  // Skip expensive animations on mobile
  if (isMobile || prefersReducedMotion) {
    return <div className="fixed inset-0 -z-10 bg-gradient-to-br from-orange-500 via-purple-600 to-blue-600" />
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* ─── Base Gradient ─── */}
      <Grainient 
        className="absolute inset-0" 
        color1="#ea7a32" 
        color2="#df995e" 
        color3="#7B93DB" 
        timeSpeed={0.15}
        grainAmount={0.05}
        colorBalance={-0.15}
        rotationAmount={180.0}
        warpAmplitude={80.0}
        warpSpeed={1.0}
        warpFrequency={3.0}
      />

      {/* ─── SVG Grain Noise ─── */}
      <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none mix-blend-overlay">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* ══════════════════════════════════════════
          TECHY ELEMENTS — high visibility layer
          ══════════════════════════════════════════ */}

      {/* ─── Large Hexagon — top-left ─── */}
      <svg
        className="absolute pointer-events-none"
        style={{
          top: '5%', left: '3%',
          width: '220px', height: '220px',
          animation: 'floatA 20s ease-in-out infinite',
        }}
        viewBox="0 0 120 120"
      >
        <polygon
          points="60,5 110,30 110,80 60,105 10,80 10,30"
          fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"
        />
      </svg>

      {/* ─── Medium Hexagon — bottom-right ─── */}
      <svg
        className="absolute pointer-events-none"
        style={{
          bottom: '15%', right: '8%',
          width: '160px', height: '160px',
          animation: 'floatB 25s ease-in-out infinite',
        }}
        viewBox="0 0 80 80"
      >
        <polygon
          points="40,4 74,20 74,56 40,72 6,56 6,20"
          fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2"
        />
      </svg>

      {/* ─── Small Hexagon — center-left ─── */}
      <svg
        className="absolute pointer-events-none"
        style={{
          top: '55%', left: '12%',
          width: '100px', height: '100px',
          animation: 'floatC 22s ease-in-out infinite',
        }}
        viewBox="0 0 80 80"
      >
        <polygon
          points="40,4 74,20 74,56 40,72 6,56 6,20"
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1"
        />
      </svg>

      {/* ─── Diamond — right ─── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '22%', right: '12%',
          width: '100px', height: '100px',
          border: '1.5px solid rgba(255,255,255,0.35)',
          transform: 'rotate(45deg)',
          animation: 'floatC 18s ease-in-out infinite',
        }}
      />

      {/* ─── Diamond 2 — left mid ─── */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '30%', left: '8%',
          width: '60px', height: '60px',
          border: '1.5px solid rgba(255,255,255,0.28)',
          transform: 'rotate(45deg)',
          animation: 'floatA 22s ease-in-out infinite reverse',
        }}
      />

      {/* ─── Circle ring — large ─── */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '38%', right: '18%',
          width: '160px', height: '160px',
          border: '1.5px solid rgba(255,255,255,0.28)',
          animation: 'floatB 16s ease-in-out infinite',
        }}
      />

      {/* ─── Circle ring — top ─── */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '6%', left: '48%',
          width: '80px', height: '80px',
          border: '1.5px solid rgba(255,255,255,0.25)',
          animation: 'floatC 20s ease-in-out infinite',
        }}
      />

      {/* ─── Circle ring — bottom ─── */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          bottom: '8%', left: '32%',
          width: '120px', height: '120px',
          border: '1px solid rgba(255,255,255,0.2)',
          animation: 'floatA 24s ease-in-out infinite',
        }}
      />

      {/* ─── Orbital Ring — top-right ─── */}
      <svg
        className="absolute pointer-events-none"
        style={{
          top: '-2%', right: '-2%',
          width: '450px', height: '450px',
          animation: 'spinSlow 60s linear infinite',
        }}
        viewBox="0 0 300 300"
      >
        <ellipse cx="150" cy="150" rx="140" ry="55" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="10 16" />
      </svg>

      {/* ─── Orbital Ring — bottom-left ─── */}
      <svg
        className="absolute pointer-events-none"
        style={{
          bottom: '2%', left: '-2%',
          width: '380px', height: '380px',
          animation: 'spinSlow 45s linear infinite reverse',
        }}
        viewBox="0 0 220 220"
      >
        <ellipse cx="110" cy="110" rx="100" ry="45" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.8" strokeDasharray="8 14" />
      </svg>

      {/* ─── Glowing Orb — warm ─── */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '15%', left: '20%',
          width: '280px', height: '280px',
          background: 'radial-gradient(circle, rgba(255,200,100,0.25) 0%, transparent 60%)',
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />

      {/* ─── Glowing Orb — teal ─── */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          bottom: '8%', right: '12%',
          width: '320px', height: '320px',
          background: 'radial-gradient(circle, rgba(91,168,160,0.2) 0%, transparent 60%)',
          animation: 'pulse 10s ease-in-out infinite 3s',
        }}
      />

      {/* ─── Constellation Lines + Nodes ─── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Lines */}
        <line x1="10%" y1="15%" x2="40%" y2="30%" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="40%" y1="30%" x2="70%" y2="18%" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="70%" y1="18%" x2="90%" y2="38%" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="25%" y1="55%" x2="50%" y2="65%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="50%" y1="65%" x2="78%" y2="52%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="10%" y1="72%" x2="30%" y2="58%" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        <line x1="62%" y1="78%" x2="88%" y2="65%" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        {/* Nodes at intersections */}
        <circle cx="10%" cy="15%" r="3.5" fill="rgba(255,255,255,0.4)" />
        <circle cx="40%" cy="30%" r="4" fill="rgba(255,255,255,0.4)" />
        <circle cx="70%" cy="18%" r="3.5" fill="rgba(255,255,255,0.35)" />
        <circle cx="90%" cy="38%" r="3" fill="rgba(255,255,255,0.3)" />
        <circle cx="25%" cy="55%" r="3" fill="rgba(255,255,255,0.3)" />
        <circle cx="50%" cy="65%" r="3.5" fill="rgba(255,255,255,0.35)" />
        <circle cx="78%" cy="52%" r="3.5" fill="rgba(255,255,255,0.35)" />
      </svg>

      {/* ─── Floating Particles ─── */}
      {[
        { top: '10%', left: '40%', size: 5 },
        { top: '20%', left: '75%', size: 4 },
        { top: '35%', left: '6%', size: 5 },
        { top: '58%', left: '25%', size: 4 },
        { top: '70%', left: '55%', size: 5 },
        { top: '45%', left: '80%', size: 4 },
        { top: '80%', left: '35%', size: 4 },
        { top: '6%', left: '60%', size: 4 },
        { top: '30%', left: '50%', size: 4 },
        { top: '65%', left: '12%', size: 5 },
        { top: '42%', left: '62%', size: 4 },
        { top: '88%', left: '72%', size: 4 },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: p.top, left: p.left,
            width: p.size, height: p.size,
            background: 'rgba(255,255,255,0.7)',
            animation: `particle 8s ease-in-out infinite ${i * 0.8}s`,
          }}
        />
      ))}

      {/* ─── Cross / Plus signs ─── */}
      {[
        { top: '22%', left: '38%', size: 28 },
        { top: '68%', left: '72%', size: 24 },
        { top: '78%', left: '52%', size: 22 },
        { top: '12%', left: '78%', size: 20 },
        { top: '48%', left: '8%', size: 26 },
      ].map((p, i) => (
        <svg
          key={`cross-${i}`}
          className="absolute pointer-events-none"
          width={p.size} height={p.size}
          style={{
            top: p.top, left: p.left,
            animation: `floatA ${15 + i * 3}s ease-in-out infinite ${i * 2}s`,
          }}
          viewBox="0 0 20 20"
        >
          <line x1="10" y1="3" x2="10" y2="17" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="3" y1="10" x2="17" y2="10" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ))}

      {/* ─── Triangle — top ─── */}
      <svg
        className="absolute pointer-events-none"
        style={{
          top: '8%', left: '28%',
          width: '70px', height: '70px',
          animation: 'floatB 19s ease-in-out infinite',
        }}
        viewBox="0 0 60 60"
      >
        <polygon points="30,5 55,50 5,50" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      </svg>

      {/* ─── Triangle — bottom ─── */}
      <svg
        className="absolute pointer-events-none"
        style={{
          bottom: '25%', right: '22%',
          width: '50px', height: '50px',
          animation: 'floatA 23s ease-in-out infinite reverse',
        }}
        viewBox="0 0 60 60"
      >
        <polygon points="30,5 55,50 5,50" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
      </svg>

    </div>
  )
})

export default GrainyGradient
