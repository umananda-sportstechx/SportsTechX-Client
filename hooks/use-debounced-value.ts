'use client';

import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates `delayMs` after the
 * source stops changing. Use to drive API calls from text-input state without
 * firing on every keystroke.
 *
 * Pattern:
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebouncedValue(search, 300);
 *   const { data } = useSWR(qk.x.list({ search: debouncedSearch }));
 *   <Input value={search} onChange={e => setSearch(e.target.value)} />
 *
 * The input remains controlled by `search` so typing feels instant, but the
 * query only re-runs after the user pauses for 300ms.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
