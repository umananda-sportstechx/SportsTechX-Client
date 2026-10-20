/* Self-check for rewriteReportHref.  Run: node components/features/reports/report-kit/rewrite-href.check.ts */
import { rewriteReportHref } from './rewrite-href.ts';
import assert from 'node:assert';

const cases: [string | null | undefined, string][] = [
	// hub domain → relative Atlas path
	['https://hub.sportstechx.com/companies', '/companies'],
	['https://app.sportstechx.com/ecosystem', '/investors'],
	['https://atlas.sportstechx.com/ma', '/ma'],
	['https://hub.sportstechx.com', '/'],
	// relative hub paths → mapped
	['/analytics', '/analytics'],
	['/ecosystem/abc?x=1', '/investors/abc?x=1'],
	['/companies/acme', '/companies/acme'],
	['/funding', '/recently-funded'],
	['/startups', '/companies'],
	// unknown hub route on sportstechx → kept relative (stays in Atlas)
	['/some-new-page', '/some-new-page'],
	// protocol-relative hub link → mapped; protocol-relative external → untouched
	['//hub.sportstechx.com/companies', '/companies'],
	['//evil.com/companies', '//evil.com/companies'],
	// genuinely external / non-nav → untouched
	['https://www.linkedin.com/in/x', 'https://www.linkedin.com/in/x'],
	['mailto:a@b.com', 'mailto:a@b.com'],
	['#section', '#section'],
	[undefined, '#'],
	['', '#'],
];

let failures = 0;
for (const [input, expected] of cases) {
	const got = rewriteReportHref(input);
	try { assert.strictEqual(got, expected); }
	catch { failures++; console.log(`FAIL  ${JSON.stringify(input)} -> ${JSON.stringify(got)} (expected ${JSON.stringify(expected)})`); }
}
console.log(failures === 0 ? `PASS (${cases.length} cases)` : `FAIL — ${failures}/${cases.length}`);
process.exitCode = failures === 0 ? 0 : 1;
