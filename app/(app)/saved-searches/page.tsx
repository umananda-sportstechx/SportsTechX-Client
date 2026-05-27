import { redirect } from 'next/navigation';

/**
 * Legacy `/saved-searches` URL preserved as a redirect into the unified
 * `/lists?tab=saved-searches` page. Email deep-links from save notifications
 * land here.
 */
export default function SavedSearchesRedirect() {
	redirect('/lists?tab=saved-searches');
}
