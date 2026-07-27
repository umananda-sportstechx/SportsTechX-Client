import type { ProviderDoc } from './providers';
import { BrandLogo } from '@/components/brand-logo';

/** Docs wrapper over the shared BrandLogo (local /public/logos SVGs + branded fallback). */
export function ProviderLogo({ doc, size = 52 }: { doc: ProviderDoc; size?: number }) {
	return <BrandLogo id={doc.slug} label={doc.label} brand={doc.brand} size={size} />;
}
