// The recorder-free Mixpanel build (lib/analytics.ts loads it lazily). Same API
// as the package's default export, which is what carries the types.
declare module 'mixpanel-browser/dist/mixpanel-core.cjs.js' {
	import mixpanel from 'mixpanel-browser';
	export default mixpanel;
}
