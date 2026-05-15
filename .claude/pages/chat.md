# `/chat/[id]`

**File:** [app/(app)/chat/[id]/page.tsx](<../../app/(app)/chat/[id]/page.tsx>)
**Purpose:** SSE-streamed AI chat with the SportsTechX agent. Persists conversation history server-side; tool calls (DB queries, web search) appear inline.

## Queries

| Key | Source | Notes |
|---|---|---|
| `qk.chat.conversations()` | `GET /api/chat/conversations` | sidebar list (if rendered) |
| `qk.chat.conversationDetail(id)` | `GET /api/chat/conversations/<id>` | message history for the open thread |

## Mutations / streams

- **Send message:** `POST /api/chat` (SSE response, not regular JSON). Streamed events: `conversation` (id), `thinking`, `tool_call`, `tool_result`, `content_delta`, `done`, `error`. Client uses `fetch` + ReadableStream (NOT `apiRequest`, because that buffers the full body).
- **Rename:** `PATCH /api/chat/conversations/<id>` with `{ title }`.
- **Delete:** `DELETE /api/chat/conversations/<id>`.

## Feature gates

Page-level: `ai_chat` — plus+. Free tier sees an upgrade prompt instead of the chat UI.

## Credits

Each turn costs 5 AI credits (server-side `credit_operations.ai.chat_turn`). The page should show the user's balance and pre-check before streaming. The backend pre-checks too — if balance < 5, returns `402 INSUFFICIENT_CREDITS` before the stream starts.

## Related components

- `components/chat/message-list.tsx`
- `components/chat/composer.tsx`
- `components/chat/tool-call-block.tsx` (collapsible details for tool inputs/outputs)
- `components/shell/ai-panel.tsx` (slide-over variant launched from anywhere in the app)

## Gotchas

- **SSE is NOT compatible with `apiRequest()`** — that's a regular fetch that buffers the body. Use raw `fetch` + `response.body.getReader()` or `@microsoft/fetch-event-source`.
- **Auth header injection for SSE:** still need `Authorization: Bearer <jwt>`. Use `getAuthHeaders()` to get the header before the fetch call.
- **Heartbeat every 15s** from the server keeps the connection alive. If absent for >20s, assume disconnection.
- **History window is 20 messages** (sliding window enforced server-side). The full conversation persists in DB; only the last 20 are sent to Claude as context.
- **Markdown export:** `GET /api/chat/conversations/<id>/export` returns a `.md` file wrapping tool calls in `<details>` blocks.
- **Conversation ID auto-created if not provided** in the body. The first chunk of the SSE stream tells you the assigned id.
