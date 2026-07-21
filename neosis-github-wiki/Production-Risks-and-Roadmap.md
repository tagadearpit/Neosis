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
