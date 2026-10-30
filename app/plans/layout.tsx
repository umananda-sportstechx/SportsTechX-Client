import type { Metadata } from 'next';
import '@/components/atlas/styles/tokens.css';

export const metadata: Metadata = { title: 'Plans & Pricing' };

/**
 * Public, chrome-less pricing page: no app shell and no auth gate, so it renders
 * for signed-in and signed-out visitors alike (middleware lets `/plans` through;
 * see lib/public-paths.ts). `.atlas` scopes the design tokens the Plans
 * component relies on — nothing above this route group mounts them.
 */
export default function PlansLayout({ children }: { children: React.ReactNode }) {
	return <div className="atlas plans-public">{children}</div>;
}
