'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Code, Key, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

const SWAGGER_URL = process.env.NEXT_PUBLIC_API_DOCS_URL ?? '/api/docs';

export default function ApiDocsPage() {
	return (
		<div className="p-4 md:p-8 max-w-4xl mx-auto">
			<PageHeader
				title="API Documentation"
				subtitle="Programmatic access to the SportsTechX intelligence platform"
			/>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<BookOpen className="h-5 w-5" />Interactive API explorer (Swagger)
					</CardTitle>
					<CardDescription>
						Full OpenAPI spec — list of every endpoint, request shapes, response schemas, and a "Try it out" button per endpoint.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild>
						<a href={SWAGGER_URL} target="_blank" rel="noopener noreferrer">
							<ExternalLink className="h-4 w-4 mr-2" />Open Swagger UI
						</a>
					</Button>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2 mb-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Key className="h-4 w-4" />Authentication
						</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground space-y-2">
						<p>Two auth methods are supported:</p>
						<ul className="list-disc list-inside space-y-1 text-xs">
							<li><code className="bg-muted px-1 rounded">Authorization: Bearer &lt;jwt&gt;</code> — for the frontend (Supabase access token)</li>
							<li><code className="bg-muted px-1 rounded">Authorization: Bearer sk_live_…</code> — for server-to-server with an API key</li>
						</ul>
						<Button size="sm" variant="outline" asChild className="mt-2">
							<Link href="/api-keys">Manage API keys →</Link>
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Code className="h-4 w-4" />Rate limits
						</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground">
						<table className="w-full text-xs">
							<thead className="text-left">
								<tr><th className="pb-1">Tier</th><th className="pb-1">/min</th><th className="pb-1">/hour</th><th className="pb-1">/day</th></tr>
							</thead>
							<tbody className="font-mono">
								<tr><td>Plus</td><td>60</td><td>3,600</td><td>50K</td></tr>
								<tr><td>Pro</td><td>600</td><td>36,000</td><td>500K</td></tr>
								<tr><td>Enterprise</td><td>6,000</td><td>360K</td><td>5M</td></tr>
							</tbody>
						</table>
						<p className="mt-3 text-xs">Headers <code className="bg-muted px-1 rounded">X-RateLimit-Remaining</code> + <code className="bg-muted px-1 rounded">X-RateLimit-Reset</code> on every response.</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Quick reference</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-xs">
						<div className="flex items-center gap-3">
							<Badge variant="secondary" className="font-mono">GET /api/v1/companies</Badge>
							<span className="text-muted-foreground">List companies (paginated, filterable)</span>
						</div>
						<div className="flex items-center gap-3">
							<Badge variant="secondary" className="font-mono">GET /api/v1/companies/:idOrSlug</Badge>
							<span className="text-muted-foreground">Single company detail</span>
						</div>
						<div className="flex items-center gap-3">
							<Badge variant="secondary" className="font-mono">GET /api/v1/investors</Badge>
							<span className="text-muted-foreground">List investors</span>
						</div>
						<div className="flex items-center gap-3">
							<Badge variant="secondary" className="font-mono">GET /api/v1/deals</Badge>
							<span className="text-muted-foreground">List funding deals</span>
						</div>
					</div>
					<p className="text-xs text-muted-foreground mt-4">
						See Swagger UI for the complete list (including admin-only endpoints, webhook contracts, and chat streaming).
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
