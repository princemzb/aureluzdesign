import Image from 'next/image';
import { getLogo } from '@/lib/actions/settings.actions';

interface SiteLogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export async function SiteLogo({
  className = 'h-16 w-auto',
  width = 360,
  height = 144,
  priority = false,
}: SiteLogoProps) {
  const logoUrl = await getLogo();

  return (
    <Image
      src={logoUrl}
      alt="AureLuz Design - Décoration événementielle"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}

// For client components that need the logo URL
export async function getLogoUrl(): Promise<string> {
  return getLogo();
}
