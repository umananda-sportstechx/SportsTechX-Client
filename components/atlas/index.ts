/**
 * Atlas design system — the single import surface for every product
 * (Raise and Scout today; Explore next):
 *
 *   import { Screen, PageHead, Card, Button, FilterBar, ComboBarLine } from '@/components/atlas';
 *
 * Importing this module also loads all design-system styles (styles/*, in cascade order).
 * See components/atlas/README.md for the layout and editing guide.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/charts.css';

// Primitives
export { cx } from './ui/cx';
export { Screen, PageHead, SectionHead, H1, H2, Sub, Eyebrow, Loading, Empty } from './ui/layout';
export { Card } from './ui/card';
export { Button, Action } from './ui/button';
export { Field, Input, Textarea, Select, ReadOnly } from './ui/form';
export { Badge } from './ui/badge';
export { Tabs, Seg } from './ui/tabs';
export { Stat, Progress } from './ui/stat';

// Patterns
export { FilterBar } from './patterns/filter-bar';
export { useDismiss } from './patterns/use-dismiss';
export type { FilterDef, FilterGroup } from './patterns/filter-bar';
export { Logo, Flag, countryToIso } from './patterns/entity-logo';
export { StagedLoader } from './patterns/staged-loader';
export { FeedCard } from './patterns/feed-card';
export { ListSwitcher } from './patterns/list-switcher';
export type { SwitcherList } from './patterns/list-switcher';
export { Pager, CardGrid, LockedFilters, lockedFiltersNote } from './patterns/catalog-ui';

// Charts
export * from './charts';

// Brand + app frame
export { AtlasLogo } from './brand/atlas-logo';
export { AtlasShell } from './shell/atlas-shell';
export type { AtlasShellProps } from './shell/atlas-shell';
export { isSection, pickActive, flattenNav } from './shell/nav';
export type { ShellNavItem, ShellNavSection, ShellNavEntry } from './shell/nav';
export { TabbedPageHeader } from './patterns/tabbed-page-header';
export { NavSectionHeader } from './patterns/nav-section-header';
export { PlaceholderTag, PLACEHOLDER_LABEL } from './patterns/placeholder-tag';
export { AgentComposer } from './patterns/agent-composer';
export type { HeaderTab } from './patterns/tabbed-page-header';
