import { useEffect, useRef, useState } from 'react';
import { VIEWBOX, MARK, WORD } from './logoPaths';

/**
 * L-mobile logo as inline SVG. The two halves of the mark draw their outline, fill in and slide
 * together; then the lettering wipes in. Plays once when it enters the viewport.
 * mode="scrub": no intro – halves are positioned by GSAP on scroll (see App.jsx).
 */
export default function AnimatedLogo({ className = '', label = 'L-mobile infrastructure', mode = 'play' }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (mode !== 'play') return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [mode]);

  return (
    <svg
      ref={ref}
      className={`alogo alogo--${mode}${on ? ' is-on' : ''} ${className}`}
      viewBox={VIEWBOX}
      shapeRendering="geometricPrecision"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <path className="alogo__a" d={MARK[0]} pathLength="1" />
      <path className="alogo__b" d={MARK[1]} pathLength="1" />
      {/* one path with evenodd keeps the counters of O/B open */}
      <path className="alogo__word" d={WORD.join(' ')} fillRule="evenodd" />
    </svg>
  );
}
