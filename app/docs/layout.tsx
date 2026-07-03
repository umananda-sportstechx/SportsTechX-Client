import Link from 'next/link';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
					<Link href="/docs/integrations" className="flex items-center gap-2 font-semibold tracking-tight">
						<span className="inline-grid place-items-center w-6 h-6 rounded-md bg-primary text-primary-foreground text-[11px] font-bold">S</span>
						SportsTechX <span className="text-muted-foreground font-normal">Docs</span>
					</Link>
					<Link href="/integrations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Open app →</Link>
				</div>
			</header>

			{children}

			<footer className="border-t border-border/60 mt-16">
				<div className="max-w-4xl mx-auto px-5 py-8 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 justify-between">
					<span>© SportsTechX</span>
					<span className="flex gap-5">
						<Link href="/docs/integrations" className="hover:text-foreground">Integrations</Link>
						<Link href="/privacy-policy" className="hover:text-foreground">Privacy</Link>
						<Link href="/terms-of-service" className="hover:text-foreground">Terms</Link>
					</span>
				</div>
			</footer>
		</div>
	);
}
