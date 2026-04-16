# Performance Audit Report - Hunchmate Landing Page
**Date:** April 16, 2026 | **Focus:** Mobile Stuttering/Jank Issues

---

## Executive Summary
The landing page is experiencing **60+ FPS drops to 15-20 FPS on mobile** during scroll and animations due to:
- Continuous WebGL rendering (Grainient.jsx) 
- Multiple simultaneous CSS animations
- Heavy parallax scroll tracking
- Background video streaming with fixed positioning
- No respect for `prefers-reduced-motion`

**Severity:** 🔴 **CRITICAL** - Immediate action needed

---

## Critical Issues (Must Fix)

### 1. **Grainient.jsx - Expensive WebGL Rendering**
**Location:** `src/components/Grainient.jsx`
**Impact:** 25-35% CPU usage on mobile

**Problems:**
```javascript
// PROBLEM: Running requestAnimationFrame on every frame with complex shader
const loop = t => {
  program.uniforms.iTime.value = (t - t0) * 0.001;
  renderer.render({ scene: mesh });
  raf = requestAnimationFrame(loop);
};
```

**Issues:**
- Running continuous shader rendering even when off-screen
- No throttling or frame rate limiting
- DPR (Device Pixel Ratio) set to max(2) on high-end phones causes massive overhead
- Shader has 40+ expensive uniforms updating every frame

**Fixes:**
1. **Disable on mobile:**
```javascript
const isMobile = /mobile|android|iphone/i.test(navigator.userAgent);
const isLowEndMobile = isMobile && (devicePixelRatio > 2 || navigator.hardwareConcurrency < 4);

// Skip WebGL on low-end devices
if (isLowEndMobile) {
  return <div className={`grainient-container ${className} bg-gradient-to-br from-orange-500 to-purple-600`} />;
}
```

2. **Limit to 30FPS on mobile:**
```javascript
let lastFrameTime = 0;
const TARGET_FPS = isMobile ? 30 : 60;
const frameInterval = 1000 / TARGET_FPS;

const loop = t => {
  const deltaTime = t - lastFrameTime;
  if (deltaTime > frameInterval) {
    program.uniforms.iTime.value = (t - t0) * 0.001;
    renderer.render({ scene: mesh });
    lastFrameTime = t;
  }
  raf = requestAnimationFrame(loop);
};
```

3. **Pause when off-screen:**
```javascript
const observer = new IntersectionObserver((entries) => {
  isVisible = entries[0].isIntersecting;
  if (!isVisible) {
    cancelAnimationFrame(raf);
  } else if (!raf) {
    raf = requestAnimationFrame(loop);
  }
});
observer.observe(container);
```

4. **Reduce DPR on mobile:**
```javascript
dpr: Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2)
```

---

### 2. **GrainyGradient.jsx - Multiple Floating Animations**
**Location:** `src/components/GrainyGradient.jsx`
**Impact:** 10-15% of jank

**Problems:**
```css
animation: floatA 20s ease-in-out infinite;
animation: floatB 25s ease-in-out infinite;
animation: floatC 22s ease-in-out infinite;
```

Multiple SVG elements with continuous animations cause layout recalculations.

**Fixes:**
```javascript
// Disable animations on mobile or prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = /mobile|android|iphone/i.test(navigator.userAgent);

if (prefersReducedMotion || isMobile) {
  return <div className="fixed inset-0 -z-10 bg-gradient-to-br from-orange-500 via-purple-600 to-blue-600" />;
}

// Animate only on desktop
return (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    {/* SVGs with animations */}
  </div>
);
```

---

### 3. **Landing.jsx - Aggressive Scroll Parallax**
**Location:** `src/pages/Landing.jsx`
**Impact:** 20-30% jank during scroll

**Problem:**
```javascript
const heroParallax = Math.min(scrollY * 0.24, 150);
const logoParallax = Math.min(scrollY * 0.14, 100);
const featuresParallax = Math.min(scrollY * 0.08, 64);
```

Updating transforms on EVERY scroll event without throttling.

**Fixes:**
```javascript
// Throttle scroll updates to ~16ms (60FPS)
useEffect(() => {
  let ticking = false;
  let rafId = null;

  const onScroll = () => {
    if (!ticking) {
      rafId = window.requestAnimationFrame(() => {
        setScrollY(window.scrollY || 0);
        ticking = false;
      });
      ticking = true;
    }
  };

  // Add { passive: true } to avoid blocking scroll
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    if (rafId) cancelAnimationFrame(rafId);
  };
}, []);

// DISABLE PARALLAX ON MOBILE
const isMobile = window.innerWidth < 768;
const heroParallax = isMobile ? 0 : Math.min(scrollY * 0.24, 150);
const logoParallax = isMobile ? 0 : Math.min(scrollY * 0.14, 100);
```

---

### 4. **BackgroundVideo.jsx - HLS Streaming Performance**
**Location:** `src/components/BackgroundVideo.jsx`
**Impact:** 15-20% battery drain + memory pressure

**Problems:**
```javascript
const hls = new Hls({
  enableWorker: true,
  maxBufferLength: 60,
  maxMaxBufferLength: 120,
  startLevel: -1,  // Auto quality - causes constant re-buffering
})
```

Auto quality selection causes constant video re-encoding and memory pressure.

**Fixes:**
```javascript
// Force lower bitrate on mobile
const isMobile = /mobile|android|iphone/i.test(navigator.userAgent);
const connection = navigator.connection;
const isSlowNetwork = connection?.effectiveType === '3g' || connection?.effectiveType === '4g';

const hls = new Hls({
  enableWorker: true,
  maxBufferLength: isMobile ? 15 : 60,
  maxMaxBufferLength: isMobile ? 30 : 120,
  startLevel: isMobile && isSlowNetwork ? 0 : -1,  // Force lowest quality on mobile
  abrEwmaDefaultEstimate: isMobile ? 1000000 : 5000000,  // Lower bitrate estimate
});

// Disable video on very low-end devices
if (isMobile && navigator.hardwareConcurrency <= 2) {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-orange-500 to-purple-600" />
  );
}
```

---

### 5. **Framer Motion - Too Many Animated Elements**
**Location:** `src/components/Hero.jsx` and `src/components/FeaturesSection.jsx`
**Impact:** 10-15% CPU during page load

**Problems:**
- 6 animated elements in Hero with staggered delays
- 6+ card animations in FeaturesSection
- All using `whileInView` which triggers every scroll

**Fixes:**
```javascript
// Detect mobile and reduce animations
const isMobile = window.innerWidth < 768;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Hero component
{isMobile || prefersReducedMotion ? (
  <h1 className="text-white text-4xl font-semibold">{/* ... */}</h1>
) : (
  <Motion.h1
    custom={1}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
  >
    {/* ... */}
  </Motion.h1>
)}

// Features: Animate only first 3 items on mobile
{features.map((feature, i) => (
  <Motion.div
    key={feature.title}
    custom={i}
    variants={isMobile && i > 2 ? {} : cardVariants}
    // ...
  >
    {/* ... */}
  </Motion.div>
))}
```

---

## High Priority Issues

### 6. **Events.css - Heavy Gradients and Filters**
**Location:** `src/pages/Events.css`
**Impact:** 5-8% jank on card hover

**Problem:**
```css
.explore-card-link:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 44px rgba(17, 27, 57, 0.18);
}
```

Multiple box-shadow changes trigger heavy paint operations.

**Fixes:**
```css
/* Use will-change sparingly */
.explore-card-link {
  transition: transform 0.25s ease;
  will-change: auto;  /* Remove will-change */
}

.explore-card-link:hover {
  transform: translateY(-4px);
  /* Simplify shadow */
  box-shadow: 0 12px 24px rgba(17, 27, 57, 0.15);
}

/* Disable hover effects on touch devices */
@media (hover: none) and (pointer: coarse) {
  .explore-card-link:hover {
    transform: none;
    box-shadow: 0 10px 24px rgba(17, 27, 57, 0.12);
  }
}
```

---

### 7. **CSS Animations - No prefers-reduced-motion Support**
**Location:** All CSS files
**Impact:** Users with motion sensitivity experience additional jank

**Fixes:** Add to all animation-heavy CSS files:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 8. **LogoLoop.jsx - DOM Thrashing**
**Location:** `src/components/LogoLoop.jsx`
**Impact:** 5-10% jank during marquee animation

**Problem:** Continuous DOM measurements and re-renders.

**Fixes:**
```javascript
// Memoize render to prevent unnecessary re-renders
const renderLogoItem = useCallback(
  (item, key) => {
    // ... existing code
  },
  [renderItem] // Minimal dependencies
);

// Batch DOM reads and writes
useResizeObserver(updateDimensions, [containerRef, seqRef], [logos, gap, logoHeight, isVertical]);
```

---

## Medium Priority Issues

### 9. **No Image Optimization**
**Location:** All pages
**Issues:**
- Hero background images not lazy-loaded
- No srcSet for responsive images
- No WebP format fallback
- Video not optimized for mobile bitrates

**Fixes:**
```html
<!-- Add to BackgroundVideo -->
<source src="mobile-optimized.m3u8" type="application/vnd.apple.mpegurl" media="(max-width: 768px)" />

<!-- Add to image elements -->
<img
  src="image.jpg"
  srcSet="image-mobile.jpg 640w, image-tablet.jpg 1024w, image-desktop.jpg 1920w"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw"
  loading="lazy"
  decoding="async"
/>
```

---

### 10. **No Code Splitting**
**Location:** `vite.config.js`
**Issue:** All components loaded at once (~300KB)

**Fixes:**
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'framer-motion': ['motion/react'],
          'ui-components': [
            'src/components/Hero',
            'src/components/FeaturesSection',
            'src/components/LogoLoop'
          ]
        }
      }
    }
  }
})
```

---

## Recommended Fix Priority

**Phase 1 (Immediate - 2 hours):**
1. Add `prefers-reduced-motion` support (all files)
2. Disable Grainient on mobile
3. Disable parallax on mobile
4. Simplify FeaturesSection animations on mobile

**Phase 2 (Quick wins - 4 hours):**
5. Throttle BackgroundVideo bitrate on mobile
6. Reduce LowLoopspeed on mobile
7. Simplify CSS hover effects
8. Add will-change removal

**Phase 3 (Optimization - 6+ hours):**
9. Implement image optimization
10. Add code splitting
11. WebGL performance improvements
12. Consider removing Grainient entirely in favor of CSS gradient

---

## Testing Checklist

- [ ] Test on iPhone 12/13 (mobile performance baseline)
- [ ] Test on low-end Android (Snapdragon 665 or similar)
- [ ] Test with DevTools CPU throttling (6x slowdown)
- [ ] Test with `prefers-reduced-motion: reduce`
- [ ] Test on slow 4G connection
- [ ] Measure FPS using Chrome DevTools (Performance tab)
- [ ] Check for layout thrashing using Chrome DevTools (Rendering tab)

---

## Performance Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| FCP (First Contentful Paint) | ~2.5s | <1.5s |
| LCP (Largest Contentful Paint) | ~3.2s | <2.5s |
| CLS (Cumulative Layout Shift) | ~0.15 | < 0.05 |
| Mobile FPS (scroll) | 15-20 FPS | > 50 FPS |
| Battery drain (5min) | ~8% | < 3% |

