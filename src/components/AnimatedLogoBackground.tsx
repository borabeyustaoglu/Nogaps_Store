import { useEffect, useState } from 'react';
import logoImage from '../assets/nogaps-logo.jpg';

interface AnimatedLogoBackgroundProps {
  className?: string;
  opacity?: number;
}

export const AnimatedLogoBackground = ({
  className = '',
  opacity = 0.22,
}: AnimatedLogoBackgroundProps) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: `translate(calc(-50% + ${offset.x * 34}px), calc(-50% + ${offset.y * 34}px)) rotate(${offset.x * 3}deg)`,
        }}
      >
        <img
          src={logoImage}
          alt=""
          aria-hidden="true"
          className="w-[74rem] max-w-none select-none animate-float-logo"
          style={{
            opacity,
            filter: 'saturate(1.35) contrast(1.2)',
          }}
        />
      </div>

      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: `translate(calc(-50% - ${offset.x * 28}px), calc(-50% - ${offset.y * 28}px)) rotate(${offset.x * -2}deg)`,
        }}
      >
        <img
          src={logoImage}
          alt=""
          aria-hidden="true"
          className="w-[80rem] max-w-none select-none animate-float-logo-slow"
          style={{
            opacity: opacity * 0.52,
            filter: 'blur(8px) saturate(1.3)',
          }}
        />
      </div>
    </div>
  );
};
