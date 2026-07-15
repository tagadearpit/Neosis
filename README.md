# Neosis

Neosis is a full-stack private messaging application built with React, Spring Boot, MongoDB, STOMP/SockJS, Google OAuth 2.0, GridFS, and WebRTC.

## Included capabilities

- Persistent Google OAuth login backed by MongoDB Spring Session
- Profile settings: display name, status message, notification sounds, typing indicators
- Permanent account deletion with user-scoped message, media, contact, preference, and session cleanup
- Contact requests with accept and reject flows
- Persistent conversation pin, mute, unread count, clear-for-me, and remove-contact controls
- Text, image, video, audio, and document messages
- Read receipts and typing indicators
- Audio/video calls with configurable TURN support
- CSRF protection, credentialed CORS, HTTP and WebSocket rate limits, validation, upload limits, health endpoints, and graceful shutdown
- PWA frontend with reproducible Docker packaging

## Security boundary

Text messages and media are encrypted in transit by HTTPS/WSS in production, but they are **not end-to-end encrypted**. The backend stores chat messages in MongoDB and media in GridFS. WebRTC audio/video transport uses DTLS-SRTP. Do not market text chat as E2EE unless a separately audited client-side cryptographic protocol is implemented.

## Local development

### Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 20.19–22
- MongoDB 7+
- A Google OAuth 2.0 web client

Configure the Google OAuth redirect URI:

```text
http://localhost:8080/login/oauth2/code/google
```

Backend:

```bash
cd neosis-backend
cp .env.example .env
set -a && source .env && set +a
mvn spring-boot:run
```

Frontend:

```bash
cd neosis-frontend
cp .env.example .env
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Docker Compose

Create a root `.env` from `.env.example`, set the Google OAuth credentials, then run:

```bash
docker compose up --build
```

The frontend is served on `http://localhost:5173`, the API on `http://localhost:8080`, and MongoDB is kept in the `neosis_mongo` volume.

## Production environment

Required backend variables:

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection URI |
| `FRONTEND_URL` | Exact HTTPS frontend origin |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SESSION_COOKIE_SECURE` | Must be `true` in production |
| `SESSION_COOKIE_SAME_SITE` | Use `none` for cross-site frontend/API deployments |

Frontend build variables:

| Variable | Purpose |
|---|---|
| `VITE_BACKEND_URL` | Public HTTPS backend URL |
| `VITE_TURN_URL` | TURN URL for reliable calls |
| `VITE_TURN_USERNAME` | TURN username |
| `VITE_TURN_CREDENTIAL` | TURN credential |

Production Google OAuth must include:

```text
https://YOUR_BACKEND_HOST/login/oauth2/code/google
```

## Validation commands

```bash
cd neosis-frontend && npm ci && npm run build
cd neosis-backend && mvn clean verify
```

The Docker backend image also runs `mvn clean verify` during its build.

## Deployment notes

- Use HTTPS for both frontend and backend. `SameSite=None` cookies are rejected by browsers unless `Secure=true`.
- Configure a TURN service; public STUN alone does not make WebRTC reliable across enterprise/mobile NATs.
- Use a MongoDB replica set if account deletion must be transactionally atomic.
- The embedded STOMP broker and in-memory rate-limit buckets are single-instance components. Multi-instance deployment requires a shared broker and distributed rate limiter.
- Add malware scanning and content-signature validation before enabling public/untrusted file uploads at scale.

See [`PRODUCTION_AUDIT.md`](PRODUCTION_AUDIT.md) for implemented controls and remaining production risks.
