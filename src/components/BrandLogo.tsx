import logoImage from '../assets/nogaps-logo.jpg';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
}

export const BrandLogo = ({ className = '', compact = false }: BrandLogoProps) => {
  return (
    <img
      src={logoImage}
      alt="NOGAPS logo"
      className={`object-contain ${compact ? 'h-10' : 'h-14'} ${className}`}
      loading="eager"
      decoding="async"
    />
  );
};
