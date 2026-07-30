# Production Risks and Roadmap

This page lists technical debt and production risks visible from the uploaded codebase.

## High-priority risks

### 1. No true end-to-end encryption

Messages are stored and processed by the backend. Do not market the app as end-to-end encrypted until client-side encryption is implemented.

Recommended path:

- Generate per-conversation encryption keys client-side.
- Encrypt message content before sending.
- Store only ciphertext on the backend.
- Design key exchange and account recovery carefully.

### 2. Simple WebSocket broker limits scaling

Spring's simple broker is fine for one backend instance. It is not enough for horizontal scaling.

Recommended path:

- Use RabbitMQ or ActiveMQ STOMP broker relay.
- Externalize sessions or use sticky sessions.
- Add reconnect handling and message delivery guarantees.

### 3. In-memory rate limiter is per-instance

Current rate limiting is stored in a Java `ConcurrentHashMap`. It resets on deploy and is not shared between instances.

Recommended path:

- Use Redis-backed rate limiting.
- Add limits by authenticated user ID/email.
- Add route-specific and global abuse protection.

### 4. Upload security still needs malware scanning

The backend checks allowlisted content types and leading file signatures, but it does
not inspect valid documents or media for malicious embedded content.

Recommended path:

- Add antivirus scanning.
- Add per-user quotas.
- Store large media outside MongoDB GridFS if storage grows.

### 5. Missing automated tests

The uploaded codebase does not include meaningful tests.

Minimum recommended test set:

- OAuth/user creation behavior.
- Contact request validation.
- Unauthorized media access rejection.
- Message send validation for non-contacts.
- Upload type and size validation.
- CSRF-protected POST behavior.
- WebSocket signaling authorization.

## Medium-priority improvements

### Observability

Add:

- Structured JSON logs.
- Request ID/correlation ID.
- Metrics for login, uploads, messages, WebSocket connections.
- Error tracking.
- Slow query logging.

### Database model

Add:

- `conversationId` to messages.
- Better compound indexes for history lookups.
- TTL cleanup for abandoned media.
- Delivery/read receipt model.

### Frontend security cleanup

- Remove reliance on anti-inspection shortcuts as a security feature.
- Tighten CSP and remove `'unsafe-inline'` where possible.
- Ensure no secrets are ever included in frontend env variables.

### WebRTC reliability

- Configure TURN for real-world mobile networks.
- Add call state timeouts.
- Handle browser permission failures clearly.
- Add better cleanup on disconnect/reconnect.

## Suggested roadmap

### Phase 1: Stabilization

- Add tests for REST and WebSocket authorization.
- Add structured logging.
- Fix documentation to avoid E2EE claims.
- Add TURN server configuration.

### Phase 2: Production hardening

- Add Redis rate limiting.
- Add file signature validation and malware scan.
- Move large media to object storage if needed.
- Tighten CSP.

### Phase 3: Scalability

- Add external STOMP broker.
- Add external session storage or sticky session strategy.
- Add conversation IDs and better indexes.
- Add monitoring dashboards.

### Phase 4: Privacy upgrade

- Design and implement client-side encryption.
- Add secure key management.
- Add encrypted media metadata strategy.

### Phase 5: Feature Expansion & Polish (Prioritized Tiers)

Grounded against current backend models (where `ChatMessage.java` currently lacks `replyTo`, `reactions`, `edited`, and `deleted` fields, and there is no `Group` / `Room` model):

#### Tier 1 — Finish What Is Already Stubbed in the UI
1. **Profile photo upload**: Wire up the disabled Privacy tab photo selector to `/api/chat/upload/avatar`, add `profilePhotoUrl` to `User`, and render avatar images across the UI.
2. **Group chats**: Create `Group` / `Room` MongoDB schema, add `conversationId` to `ChatMessage`, group STOMP WebSocket routing, and admin controls.

#### Tier 2 — High-Value Core Messaging Features
3. **Message reactions**: Double-click to ❤️, emoji picker popover, `reactions` map in `ChatMessage`, and live WS broadcast.
4. **Reply to messages**: Swipe-to-reply, quoted message preview above the bubble, `replyToMessageId` in `ChatMessage`.
5. **Message editing & deleting**: 15-minute edit window with "Edited" label, "Delete for everyone", and WS reconciliation.
6. **Forward messages**: Multi-select contact picker sheet.
7. **Link previews**: Backend Open Graph unfurling (title, description, image) with SSRF protection.
8. **Pin messages**: Conversation pinned-message banner and jump-to-pinned navigation.

#### Tier 3 — Infrastructure-Level Features
9. **True push notifications**: Web Push subscriptions stored per-device and backend push sender service.
10. **Global search across conversations**: IndexedDB / MongoDB text index search across all chats.
11. **Offline send queue**: Queue outgoing messages locally in IndexedDB when disconnected and auto-retry on reconnect.
12. **Screen sharing in calls**: Attach `navigator.mediaDevices.getDisplayMedia()` track to WebRTC peer connection.

#### Tier 4 — Polish, AI & Advanced Capabilities
13. **AI assistance**: Chat summary, smart reply suggestions, instant translation, tone rewrite, and meeting notes.
14. **Media experience**: Instagram-style fullscreen lightbox, client-side progressive image compression, and drag-and-drop upload zone.
15. **UI & Framer Motion**: Shared layout animation on chat open, Telegram-style avatar hero transition, typing bounce dots, voice waveforms, and custom theming.

