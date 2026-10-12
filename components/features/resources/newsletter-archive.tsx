'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { NewsletterArticle } from '@/types/api';
import { ResourceLibrary } from './resource-library';
import type { Resource } from './resource-contract';

/**
 * Newsletter — latest edition + archive. Live against the Beehiiv feed via
 * `GET /api/newsletter/articles`, shared by Raise, Scout and Explore.
 *
 * "View edition" opens the issue at its canonical Beehiiv URL. The feed does
 * carry the issue HTML, but rendering third-party HTML in-app needs a
 * sanitiser this client does not have, and Beehiiv is where the edition lives.
 *
 * Every edition is free to read, so `access` is a constant.
 */
const toResource = (a: NewsletterArticle): Resource => ({
	id: a.slug,
	title: a.title,
	desc: a.description,
	date: a.pubDate,
	access: 'Free',
	tags: a.categories,
	cover: a.thumbnail || null,
	href: a.link,
	external: true,
});

export function NewsletterArchive() {
	// A bare array, not a paginated envelope, and the server caches the parsed
	// feed — so no params and no pager here.
	const res = useSWR<NewsletterArticle[]>(qk.newsletter.articles());
	const items = useMemo(
		() => [...(res.data ?? [])].sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate)).map(toResource),
		[res.data],
	);

	return (
		<ResourceLibrary
			items={items}
			kind="edition"
			isLoading={res.isLoading}
			intro="The SportsTechX briefing: funding, deals and the developments that matter across sports tech, published fortnightly."
			featuredLabel="Latest edition"
			libraryTitle="Edition archive"
			noun="edition"
			viewLabel="View edition"
			aside={`Published fortnightly · ${items.length} edition${items.length === 1 ? '' : 's'}`}
		/>
	);
}
