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

Returns the authenticated user's profile and terms state.

Authentication: permitted by security config, but returns `401` when no principal exists.

Response:

```json
{
  "email": "user@example.com",
  "name": "User Name",
  "termsAccepted": true,
  "termsAcceptedAt": "2026-07-06T12:00:00"
}
```

### `POST /api/users/accept-terms`

Marks the authenticated user's terms as accepted.

Authentication: required.

Response:

```json
{
  "termsAccepted": true
}
```

### `GET /api/users/check?email={email}`

Checks whether a user exists and sends a contact lookup notification to that user.

Authentication: required.

Responses:

| Status | Meaning |
|---:|---|
| 200 | User found. |
| 401 | Not authenticated. |
| 404 | User does not exist. |

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

### `GET /api/contacts/friends`

Returns accepted contacts as a list of email addresses.

Authentication: required.

## Messages

### `GET /api/messages/history/{friendEmail}?limit=50`

Returns message history between the authenticated user and an accepted contact.

Authentication: required.

Validation:

- `friendEmail` must not equal current user.
- Accepted contact relationship must exist.
- `limit` is clamped between `1` and `100`.

Messages are returned oldest-to-newest after fetching latest messages from MongoDB.

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
- Recipient must exist.
- Sender and recipient must be accepted contacts.
- Content type must be allowed.

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
