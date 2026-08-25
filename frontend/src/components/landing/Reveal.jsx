import { useEffect, useRef, useState } from 'react';

/* Shared entrance motion: elements resolve from blurred/transparent as they
   reach the viewport, staggered so a group lands one item at a time.
   `immediate` runs the animation on mount instead — used for the hero, which
   is already on screen when the page loads. */

const STAGGER = 90; // ms between items in a group

// Only hide things once we know the script is running — otherwise a failed or
// blocked bundle would leave the page blank instead of merely un-animated.
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('reveal-ready');
}

function useInView(immediate) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return undefined;
    const node = ref.current;
    if (!node) return undefined;

    if (immediate) {
      // A timer rather than rAF: browsers pause rAF in background tabs, and the
      // hero must not stay invisible for someone who opens the page in one.
      const id = setTimeout(() => setShown(true), 30);
      return () => clearTimeout(id);
    }
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }
    // Anything already on screen at mount resolves right away, without waiting
    // for an observer callback.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
      const id = setTimeout(() => setShown(true), 30);
      return () => clearTimeout(id);
    }
    // Safety net: if the observer never reports (a background tab defers its
    // callbacks, for one), show the content anyway rather than leaving a hole.
    const fallback = setTimeout(() => setShown(true), 2500);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(fallback);
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
    );
    io.observe(node);
    return () => {
      clearTimeout(fallback);
      io.disconnect();
    };
  }, [immediate, shown]);

  return [ref, shown];
}

export function Reveal({ children, delay = 0, immediate = false, as: Tag = 'div', className = '', ...rest }) {
  const [ref, shown] = useInView(immediate);
  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* Reveals a group of children one after another without hand-writing delays. */
export function RevealGroup({ children, start = 0, step = STAGGER, immediate = false, className = '', ...rest }) {
  return (
    <div className={className} {...rest}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <Reveal key={i} delay={start + i * step} immediate={immediate}>
              {child}
            </Reveal>
          ))
        : children}
    </div>
  );
}

/* Headline reveal, word by word — the effect used on the hero in the brief. */
export function RevealWords({ text, immediate = false, start = 0, step = 70, highlight, className = '' }) {
  const [ref, shown] = useInView(immediate);
  const words = text.split(' ');
  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => {
        const isHighlight = highlight && word.replace(/[^\w]/g, '') === highlight;
        return (
          // eslint-disable-next-line react/no-array-index-key
          <span key={`${word}-${i}`} className="inline-block">
            <span
              className={`reveal-word ${shown ? 'is-visible' : ''}`}
              style={{ '--reveal-delay': `${start + i * step}ms` }}
            >
              {isHighlight ? (
                <span className="relative inline-block">
                  <span aria-hidden className="absolute inset-x-[-0.15em] inset-y-[0.08em] bg-primary-100 rounded-lg" />
                  <span className="relative text-primary-700">{word}</span>
                </span>
              ) : (
                word
              )}
            </span>
            {i < words.length - 1 && ' '}
          </span>
        );
      })}
    </span>
  );
}
