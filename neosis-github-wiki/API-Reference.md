# API Reference

Base URL is configured by frontend environment variable:

```txt
VITE_BACKEND_URL
```

In local development:

```txt
http://localhost:8080
```

All protected endpoints rely on authenticated session cookies.

## CSRF

### `GET /api/csrf`

Returns the CSRF token and header name used by unsafe requests.

Authentication: public.

Response shape depends on Spring's `CsrfToken`, usually including:

```json
{
  "token": "...",
  "headerName": "X-XSRF-TOKEN",
  "parameterName": "_csrf"
}
```

## Users

### `GET /api/users/me`

Returns the authenticated user's profile, terms state, authentication-provider metadata,
versioned settings and a one-time new-device signal.

Authentication: permitted by security config, but returns `401` when no principal exists.

Response:

```json
{
  "email": "user@example.com",
  "name": "User Name",
  "authenticationProvider": "GOOGLE",
  "emailVerified": true,
  "passwordManagedByProvider": true,
  "termsAccepted": true,
  "termsAcceptedAt": "2026-07-06T12:00:00"
}
```

### `POST /api/users/presence`

Refreshes the authenticated user's presence timestamp. The frontend sends a bounded
heartbeat; conversation responses still enforce each contact's visibility choices.

## Settings and sessions

### `GET /api/settings`

Returns the current versioned settings document. Settings are grouped under `privacy`,
`notifications`, `appearance`, `media` and `security` instead of being added to `users`.

### `PATCH /api/settings`

Partially updates one or more settings groups. Enumerated values and accent/time formats
are validated server-side. Enabling High Privacy Mode also hides presence and previews,
disables receipts, typing and link previews, and blocks unknown attachments.

### `GET /api/security/sessions`

Lists server-side sessions for the current user. The API returns a short SHA-256
fingerprint, device/browser summary, masked IP and timestamps; it never returns the raw
session identifier.

### `DELETE /api/security/sessions/{fingerprint}`

Revokes one session belonging to the current user.

### `DELETE /api/security/sessions`

Revokes all sessions except the request's current session.

### `GET /api/security/login-history`

Returns up to 25 recent Google OAuth login events. IP addresses are masked and events
expire after 180 days through a MongoDB TTL index.

### `POST /api/users/accept-terms`

Marks the authenticated user's terms as accepted.

Authentication: required.

Response:

```json
{
  "termsAccepted": true
}
```

## Contacts

### `POST /api/contacts/request?receiverEmail={email}`

Creates a pending contact request.

Authentication: required.

Validation:

- Sender must be authenticated.
- Receiver email must be valid and not equal to sender.
- Receiver must exist.
- Pair must not already be pending or accepted.

Responses:

| Status | Meaning |
|---:|---|
| 200 | Request sent. |
| 400 | Invalid receiver or self-request. |
| 404 | Receiver user does not exist. |
| 409 | Request already exists or users are already contacts. |

### `GET /api/contacts/pending`

Returns pending contact requests for the authenticated user.

Authentication: required.

### `POST /api/contacts/accept?requestId={id}`

Accepts a pending contact request.

Authentication: required.

Validation:

- Request must exist.
- Authenticated user must be the receiver.
- Request status must be `PENDING`.

## Messages

### `GET /api/messages/history/{friendEmail}?limit=50`

Returns message history between the authenticated user and an accepted contact.

Authentication: required.

Validation:

- `friendEmail` must not equal current user.
- Accepted contact relationship must exist.
- `limit` is clamped between `1` and `100`.

Messages are returned oldest-to-newest after fetching latest messages from MongoDB.
Expired disappearing text messages are excluded, and another user's read timestamp is hidden
when that user has disabled read receipts.

### `GET /api/messages/export/{friendEmail}`

Downloads a UTF-8 text export for an accepted, unblocked contact. Exports are bounded to
10,000 non-expired messages.

## Safety and personal data

### `GET /api/safety/blocked`

Lists users blocked by the authenticated user.

### `POST /api/safety/blocked/{email}`

Blocks an existing user. Blocking is enforced in both directions for contact requests,
conversation history, messages, uploads, typing events and call signaling.

### `DELETE /api/safety/blocked/{email}`

Removes the authenticated user's block record for that email.

### `POST /api/safety/reports`

Creates a structured report with a category, optional details and optional evidence
message ID. Evidence must belong to the reporter's conversation with the reported user.

### `GET /api/data/export`

Downloads a no-store JSON export of the current user's profile, settings, relationships,
messages, blocks, submitted reports and recent login history.

### `DELETE /api/data/chats`

Advances each accepted conversation's per-user clear timestamp without deleting the
other participant's copy.

## Chat uploads

### `POST /api/chat/upload`

Uploads a file for a conversation.

Authentication: required.

Content type: `multipart/form-data`.

Fields:

| Field | Type | Required | Description |
|---|---|---:|---|
| `file` | file | Yes | Uploaded media/document. |
| `recipientEmail` | string | Yes | Accepted contact recipient email. |

Validation:

- File must not be empty.
- File must be <= 15 MB.
- Sender and recipient must be accepted contacts.
- Content type must be allowed.
- File signature must match its declared content type.

Response:

```json
{
  "id": "public-id",
  "url": "/api/chat/media/public-id",
  "filename": "safe-file-name.pdf",
  "contentType": "application/pdf",
  "size": 12345
}
```

### `GET /api/chat/media/{id}`

Streams an uploaded GridFS file.

Authentication: required.

Access rule:

- Current user must be the sender or recipient stored in file metadata.

Response behavior:

- Images, video, and audio are served inline.
- Documents are served as attachments.
- Private cache-control is set for 30 days.

## OAuth2 routes

### `GET /oauth2/authorization/google`

Starts Google OAuth2 login.

### `GET /login/oauth2/code/google`

OAuth2 callback handled internally by Spring Security.

## Logout

The frontend calls:

```txt
POST /logout
```

This route is provided by Spring Security.
