// Runs before the app starts. Installs the mock API only when NEXT_PUBLIC_MOCK_API=1
// (inert otherwise) — see lib/mock-api/README.md.
import '@/lib/mock-api';
