# Neosis Production Audit

## Implemented in this revision

### Authentication and sessions

- Replaced transient OAuth authorization-request cookies with the standard session-backed flow.
- Added MongoDB-backed Spring Session storage with a 30-day configurable cookie.
- Prevented subsequent Google logins from overwriting a user-customized display name.
- Added explicit API `401` behavior, session fixation protection, server-side logout, and health endpoint access.

### Account lifecycle

- Added profile name and status editing with server-side validation.
- Added persisted notification-sound and typing-indicator preferences.
- Added destructive account deletion requiring the literal confirmation `DELETE`.
- Account deletion removes the user’s messages, GridFS media, contact relationships, conversation preferences, and active session.

### Conversation controls

- Added per-user persistent pin and mute state.
- Added server-backed clear-for-me semantics using a conversation cutoff timestamp.
- Added remove-contact behavior.
- Added unread counts, read receipts, request rejection, contact details, and profile status display.

### Messaging and media

- Centralized CSRF acquisition/retry and API error handling in the frontend client.
- Removed manual multipart `Content-Type` headers so the browser supplies a valid boundary.
- Added strict message/media type allowlists, upload size enforcement, safe filenames, and authenticated media authorization.
- Added bounded message content, bounded history retrieval, and safer optimistic-message reconciliation.
- Corrected the UI and PWA metadata so text chat is not falsely described as end-to-end encrypted.

### Realtime and calls

- Added HTTP and STOMP per-session rate limiting.
- Added WebSocket message-size/send-buffer limits and heartbeat/reconnect handling.
- Sanitized signaling payloads before relaying them.
- Added audio-call playback, connection cleanup, busy/decline handling, permission errors, and configurable TURN settings.

### Operations

- Added graceful shutdown, response compression, health probes, container health checks, non-root runtime users, environment templates, and Docker Compose.
- Frontend assets use immutable caching while the SPA shell and service worker use safe cache policies.
- Added model-level unit tests and a frontend production-build check.

## Residual risks before public-scale launch

### No message E2EE

Messages and media are readable by the backend and database operators. Implementing E2EE requires client key identity, authenticated key exchange, device management, forward secrecy, encrypted attachments, key recovery decisions, and an independent security review. A UI label or symmetric encryption with a server-held key is not E2EE.

### Horizontal scaling

The Spring simple broker and both rate limiters are process-local. More than one backend instance can produce inconsistent subscriptions and independently enforced limits. Replace the simple broker with a broker relay and use Redis or an API gateway for distributed limits.

### File scanning

MIME allowlisting reduces browser-executable upload risk but does not detect malware or active content inside office documents. Add content-signature inspection, antivirus scanning, quarantine, and object-storage lifecycle policies.

### Deletion atomicity

Account erasure is synchronous and idempotent but not transactional on a standalone MongoDB deployment. A process failure can leave partial records. For regulated erasure, use a replica-set transaction or a durable deletion workflow with retries and an audit trail.

### Message history pagination

History is bounded to the latest 100 messages and has no cursor-based infinite pagination. Add a stable `(createdAt, id)` cursor before large conversations are expected.

### WebRTC reliability and abuse controls

A production TURN server is required. Add call ringing timeouts, TURN credential rotation, call permission controls, abuse reporting, and quality telemetry.

### Observability

Health endpoints and structured server logging exist, but there is no centralized tracing, metrics dashboard, alert policy, error aggregation, or security audit log. Add these before an SLA-backed release.

### Data retention and compliance

Define retention periods, backup/restore testing, privacy policy, terms, incident response, export/access requests, and region-specific legal requirements before collecting real user data.

## Release gate

Do not describe this repository as fully production-certified. It is production-hardened relative to the original codebase, but public launch still requires deployment-specific secrets management, HTTPS, TURN, monitoring, backup validation, dependency scanning, penetration testing, and resolution or explicit acceptance of the residual risks above.
