import { Loading } from '@/components/atlas';

/**
 * Shown by the App Router between navigations inside the signed-in shell. Every
 * page here is `force-dynamic`, so each hop hits the server — this Suspense
 * fallback is what the user sees while the next page streams. The shell
 * (sidebar + header) is in the layout above, so only the content region swaps.
 */
export default function DashboardLoading() {
	return <Loading label="Loading" />;
}
