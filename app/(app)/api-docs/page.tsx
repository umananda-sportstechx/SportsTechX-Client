'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Code, Key, BookOpen, Webhook } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { DeveloperTabs } from '@/components/developer-tabs';

const SWAGGER_URL = process.env.NEXT_PUBLIC_API_DOCS_URL ?? '/api/docs';

const ENDPOINTS: Array<{ method: string; path: string; scope: string; desc: string }> = [
	{ method: 'GET', path: '/api/v1/companies', scope: 'companies:read', desc: 'List companies (paginated, filterable — same facets as the app)' },
	{ method: 'GET', path: '/api/v1/companies/:idOrSlug', scope: 'companies:read', desc: 'Single company by id or slug' },
	{ method: 'GET', path: '/api/v1/investors', scope: 'investors:read', desc: 'List investors' },
	{ method: 'GET', path: '/api/v1/investors/:idOrSlug', scope: 'investors:read', desc: 'Single investor by id or slug' },
	{ method: 'GET', path: '/api/v1/deals', scope: 'deals:read', desc: 'List funding deals' },
	{ method: 'GET', path: '/api/v1/deals/:id', scope: 'deals:read', desc: 'Single deal by id' },
];

const EVENTS = ['company.created', 'company.updated', 'deal.created', 'deal.updated', 'investor.created', 'investor.updated', 'export.completed'];

const VERIFY_SNIPPET = `import crypto from 'node:crypto';

// Verify a Standard Webhooks signature (whsec_… secret from your dashboard).
function verify(secret, headers, rawBody) {
  const id = headers['webhook-id'];
  const ts = headers['webhook-timestamp'];
  const sigHeader = headers['webhook-signature']; // "v1,<base64>"
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key)
    .update(\`\${id}.\${ts}.\${rawBody}\`).digest('base64');
  return sigHeader.split(' ').some((p) => p === \`v1,\${expected}\`);
}`;

export default function ApiDocsPage() {
	return (
		<div className="p-4 md:p-8 max-w-4xl mx-auto">
			<PageHeader title="API Documentation" subtitle="Programmatic access to the SportsTechX intelligence platform" />

			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-5 w-5" />Interactive API explorer (Swagger)</CardTitle>
					<CardDescription>Full OpenAPI spec — every endpoint, request/response schemas, and a "Try it out" button.</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild><a href={SWAGGER_URL} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Open Swagger UI</a></Button>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2 mb-6">
				<Card>
					<CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Key className="h-4 w-4" />Authentication</CardTitle></CardHeader>
					<CardContent className="text-sm text-muted-foreground space-y-2">
						<p>Authenticate every <code className="bg-muted px-1 rounded">/api/v1</code> request with an API key, either header:</p>
						<ul className="list-disc list-inside space-y-1 text-xs">
							<li><code className="bg-muted px-1 rounded">Authorization: Bearer stx_live_…</code></li>
							<li><code className="bg-muted px-1 rounded">x-api-key: stx_live_…</code></li>
						</ul>
						<p className="text-xs">Keys are scoped (see below) and available on Growth/Pro. Test keys are prefixed <code className="bg-muted px-1 rounded">stx_test_</code>.</p>
						<Button size="sm" variant="outline" asChild className="mt-2"><Link href="/api-keys">Manage API keys →</Link></Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Code className="h-4 w-4" />Rate limits</CardTitle></CardHeader>
					<CardContent className="text-sm text-muted-foreground">
						<table className="w-full text-xs">
							<thead className="text-left"><tr><th className="pb-1">Plan</th><th className="pb-1">/min</th><th className="pb-1">/hour</th><th className="pb-1">/day</th></tr></thead>
							<tbody className="font-mono">
								<tr><td>Growth</td><td>60</td><td>3,600</td><td>50K</td></tr>
								<tr><td>Pro</td><td>600</td><td>36,000</td><td>500K</td></tr>
							</tbody>
						</table>
						<p className="mt-3 text-xs">All three windows are enforced per key. Over the limit returns <code className="bg-muted px-1 rounded">429</code> with <code className="bg-muted px-1 rounded">RATE_LIMIT_EXCEEDED</code>.</p>
					</CardContent>
				</Card>
			</div>

			<Card className="mb-6">
				<CardHeader><CardTitle className="text-sm">Endpoints</CardTitle><CardDescription>Each requires the listed scope on your API key.</CardDescription></CardHeader>
				<CardContent>
					<div className="space-y-2 text-xs">
						{ENDPOINTS.map((e) => (
							<div key={e.path} className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary" className="font-mono">{e.method} {e.path}</Badge>
								<code className="text-[10px] text-muted-foreground">{e.scope}</code>
								<span className="text-muted-foreground">— {e.desc}</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm"><Webhook className="h-4 w-4" />Webhooks</CardTitle>
					<CardDescription>Register an endpoint to receive signed, real-time events.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm text-muted-foreground">
					<div>
						<p className="text-xs mb-1.5 font-medium text-foreground">Events</p>
						<div className="flex flex-wrap gap-1.5">{EVENTS.map((e) => <code key={e} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{e}</code>)}</div>
					</div>
					<p className="text-xs">
						We POST a JSON body <code className="bg-muted px-1 rounded">{'{ id, type, created_at, data }'}</code> with Standard Webhooks headers
						(<code className="bg-muted px-1 rounded">webhook-id</code>, <code className="bg-muted px-1 rounded">webhook-timestamp</code>, <code className="bg-muted px-1 rounded">webhook-signature</code>).
						Failed deliveries retry with backoff; an endpoint auto-pauses after repeated failures.
					</p>
					<div>
						<p className="text-xs mb-1.5 font-medium text-foreground">Verify the signature</p>
						<pre className="bg-muted rounded p-3 text-[11px] overflow-x-auto"><code>{VERIFY_SNIPPET}</code></pre>
					</div>
					<Button size="sm" variant="outline" asChild><Link href="/webhooks">Manage webhooks →</Link></Button>
				</CardContent>
			</Card>
		</div>
	);
}
