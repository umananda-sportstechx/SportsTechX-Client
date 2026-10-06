'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { NewsletterArticle } from '@/types/api';
import { ResourceLibrary } from './resource-library';
import type { SampleResource } from './resource-contract';

/**
 * Newsletter — latest edition + archive. Live against the Beehiiv feed via
 * `GET /api/newsletter/articles`, shared by Raise, Scout and Explore.
 *
 * Every edition is free to read, so `access` is a constant rather than
 * something the feed carries.
 */
const toResource = (a: NewsletterArticle): SampleResource => ({
	title: a.title,
	desc: a.description,
	date: a.pubDate,
	access: 'Free',
	tags: a.categories,
});

export function NewsletterArchive() {
	// The endpoint answers with a bare array, not a paginated envelope, and the
	// server already caches the parsed feed — so no params and no pager here.
	const res = useSWR<NewsletterArticle[]>(qk.newsletter.articles());
	// Newest first: ResourceLibrary takes items[0] as the hero and its 'old'
	// sort is a positional reverse, so the order has to be right on arrival.
	const items = useMemo(() => {
		const rows = res.data ?? [];
		return [...rows]
			.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
			.map(toResource);
	}, [res.data]);

	return (
		<ResourceLibrary
			items={items}
			isLoading={res.isLoading}
			featuredLabel="Latest edition"
			libraryTitle="Edition archive"
			noun="edition"
		/>
	);
}
