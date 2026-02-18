'use client';

import { RefObject, useEffect, useState } from 'react';

type Props = {
  imageUrl: string;
  targetRef: RefObject<HTMLElement | null>;
};

export function AuthProximityBackground({ imageUrl, targetRef }: Props) {
  const [opacity, setOpacity] = useState(0);
  const [cursor, setCursor] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const target = targetRef.current;
      if (!target) {
        return;
      }

      const eventTarget = event.target;
      if (
        eventTarget instanceof Element &&
        target.contains(eventTarget) &&
        eventTarget.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        setOpacity(1);
        return;
      }

      const rect = target.getBoundingClientRect();
      const dx = Math.max(
        rect.left - event.clientX,
        0,
        event.clientX - rect.right
      );
      const dy = Math.max(
        rect.top - event.clientY,
        0,
        event.clientY - rect.bottom
      );
      const distance = Math.hypot(dx, dy);
      const maxDistance =
        Math.hypot(window.innerWidth, window.innerHeight) * 0.35;
      const nextOpacity = Math.max(0, Math.min(1, 1 - distance / maxDistance));

      setOpacity(nextOpacity);
      setCursor({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100
      });
    };

    const handleWindowLeave = () => {
      setOpacity(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleWindowLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleWindowLeave);
    };
  }, [targetRef]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-300 ease-out"
      style={{
        opacity,
        backgroundImage: `url('${imageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        WebkitMaskImage: `radial-gradient(circle at ${cursor.x}% ${cursor.y}%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 6%, rgba(0,0,0,0) 10%)`,
        maskImage: `radial-gradient(circle at ${cursor.x}% ${cursor.y}%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 6%, rgba(0,0,0,0) 10%)`
      }}
    />
  );
}
