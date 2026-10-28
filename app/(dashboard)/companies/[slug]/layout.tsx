// No paths at build time; each one renders on its first visit and is then
// served from the cache instead of a server function on every view. Safe
// because the page renders its data in the browser — the HTML is the same
// "Authenticating…" shell whatever the id.
export function generateStaticParams() {
	return [];
}

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
