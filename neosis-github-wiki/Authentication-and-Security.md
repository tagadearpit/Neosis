# Authentication and Security

## Authentication model

Neosis uses Google OAuth2 login through Spring Security.

Flow:

```txt
Frontend login button
  -> Backend /oauth2/authorization/google
  -> Google login and consent
  -> Backend /login/oauth2/code/google
  -> Backend creates/updates user
  -> Backend stores authenticated session
  -> Redirect to FRONTEND_URL/chat
```

## Session model

The backend uses a server-side session. The frontend sends cookies by setting Axios `withCredentials: true`.

Production cookie settings:

```yaml
same-site: none
secure: true
```

This is required when frontend and backend are deployed on different HTTPS origins.

## CSRF model

The backend stores CSRF tokens in the server-side session and exposes `GET /api/csrf`.

The frontend:

1. Requests `/api/csrf`.
2. Reads `token` and `headerName`.
3. Sends the token on unsafe requests.
4. Retries once with a fresh token after a `403`.

## CORS model

Allowed origins come from the exact, comma-separated `ALLOWED_ORIGINS` setting. It
falls back to `FRONTEND_URL` when not explicitly configured.

Credentials are enabled. This is correct for session-based auth, but the configured frontend URL must match the browser origin exactly.

## WebSocket security

WebSocket endpoint:

```txt
/ws
```

Allowed origins are the same frontend origins. Messages are routed through user-specific queues.

The inbound channel requires an authenticated user with accepted terms, permits only
the five application user queues, and rejects sends to destinations other than the
three documented `/app/chat.*` handlers.

Backend methods validate:

- Sender identity from authenticated principal.
- Sender and recipient are accepted contacts.
- Message type is allowed.
- Media belongs to the sender-recipient conversation.

## File upload security

Current safeguards:

- Auth required.
- Accepted-contact relationship required.
- File cannot be empty.
- Application-level upload cap of 15 MB.
- Multipart request limits configured.
- Allowed content types are restricted.
- Leading file bytes must match the declared content type.
- File names are sanitized.
- Media access checks sender/recipient ownership.
- Documents are served as attachments; media can be previewed inline.

## Rate limiting

`RateLimitFilter` applies bounded 60-second windows. Destructive and upload routes
have tighter limits, while every API route receives a general per-user or per-IP cap.

| Method | Path | Limit per window |
|---|---|---:|
| POST | `/api/chat/upload` | 20 |
| POST | `/api/contacts/request` | 30 |
The limiter uses the authenticated identity when available and remote IP before login.
Its in-memory bucket map is capped and periodically removes expired entries.

## Current security limitations

### Not true end-to-end encryption

The backend reads, validates, stores, and delivers messages. That means the system is authenticated and transport-secured, but not end-to-end encrypted at the application layer.

To claim E2EE, add client-side encryption where only clients hold decryption keys.

### Client-side anti-inspection is not security

The frontend blocks context menu and some developer tool shortcuts. This can reduce casual copying, but it does not protect source code, APIs, secrets, or data. Security must remain server-side.

### CSP can be stricter

The production CSP restricts network and media access to the deployed backend, but
styles still require `'unsafe-inline'` because the current UI uses inline style values.
Move those styles to compiled classes or add nonce-based policies to remove it.

### In-memory rate limiting is not distributed

The rate limiter is per JVM instance. Multiple deployed backend instances would each have separate counters. Use Redis or a gateway-level limiter for scalable production rate limiting.

### Simple broker is not multi-instance ready

Spring's simple broker is suitable for a single backend instance. For horizontal scaling, use a broker relay such as RabbitMQ or ActiveMQ.

## Recommended production hardening

- Add server-side structured logging and request IDs.
- Add a distributed rate limiter.
- Tighten CSP.
- Add virus/malware scanning for uploads.
- Store files in object storage for larger scale.
- Add audit logs for login, contact requests, uploads, and calls.
- Add automated tests for auth, contact access, media access, and WebSocket message validation.
- Add client-side encryption before making E2EE claims.
