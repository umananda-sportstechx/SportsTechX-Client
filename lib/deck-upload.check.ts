/**
 * Self-check for the pitch-deck upload rule. Run it with:
 *   npx tsx lib/deck-upload.check.ts
 *
 * A wrong answer here either lets a 60 MB deck through to fail at "Submit" with
 * a storage error, or refuses a valid one — both silently.
 */
import assert from 'node:assert/strict';
import { MAX_DECK_BYTES, deckContentType, deckFileError, deckUploadError } from './deck-upload.ts';

const EXTS = ['pdf', 'ppt', 'pptx'];
const file = (name: string, size: number, type = '') => ({ name, size, type }) as unknown as File;

assert.equal(deckFileError(file('deck.pdf', 20 * 1024 * 1024), EXTS), null, '20 MB PDF is fine');
assert.equal(deckFileError(file('deck.PPTX', MAX_DECK_BYTES), EXTS), null, 'exactly 50 MB, any case');
const big = deckFileError(file('deck.pdf', 63.2 * 1024 * 1024), EXTS);
assert.match(big ?? '', /63\.2 MB — the maximum is 50 MB/, 'states the size and the limit');
assert.match(deckFileError(file('deck.key', 1000), EXTS) ?? '', /PDF, PPT or PPTX/, 'names the formats');
assert.match(deckFileError(file('deck.pdf', 0), EXTS) ?? '', /empty/);
console.log('  ok    a file is judged on size and format when picked');

assert.match(deckUploadError('The object exceeded the maximum allowed size', file('d.pdf', 70 * 1024 * 1024), EXTS), /70\.0 MB — the maximum is 50 MB/);
assert.match(deckUploadError('mime type application/zip is not supported', file('d.zip', 10), EXTS), /isn’t a supported format/);
assert.match(deckUploadError('Failed to fetch', file('d.pdf', 10), EXTS), /connection/);
console.log('  ok    storage errors become specific messages');

assert.equal(deckContentType(file('d.pptx', 1)), 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'browser gave no type');
assert.equal(deckContentType(file('d.pdf', 1, 'application/pdf')), 'application/pdf', 'browser type wins');
console.log('  ok    content type falls back by extension');

console.log('\nPASS');
