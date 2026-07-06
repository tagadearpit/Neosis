# Project Overview

Neosis is a full-stack real-time communication application. The system is organized as two deployable parts:

1. `neosis-frontend` — React/Vite single-page application.
2. `neosis-backend` — Spring Boot API, WebSocket, OAuth2, MongoDB, and GridFS service.

## Main capabilities

### Authentication

- Google OAuth2 sign-in.
- Backend-created authenticated session.
- Session cookie configured for cross-site deployment with `SameSite=None` and `Secure=true`.
- Frontend verifies login state through `GET /api/users/me`.

### Contact system

- Search/check users by email.
- Send contact requests.
- Accept pending requests.
- Prevent self-requests.
- Prevent duplicate pending or accepted contact pairs through a pair key.

### Messaging

- One-to-one chat between accepted contacts only.
- STOMP WebSocket message delivery.
- Message history endpoint with safe bounded limit.
- Typing indicators through user-specific queues.

### Media and document sharing

- Uploads through `POST /api/chat/upload`.
- Maximum application-level file size: 15 MB.
- Multipart limit configured as 20 MB file / 25 MB request.
- Supported classes: images, videos, audio, and selected documents.
- Files stored in MongoDB GridFS.
- Media retrieval checks whether the current user is the sender or recipient.

### Calls

- WebRTC audio/video calls.
- STOMP signaling messages for `offer`, `answer`, `ice-candidate`, `end-call`, and `call-rejected`.
- STUN/TURN can be configured on the frontend side.

## What this project is not yet

- It is not end-to-end encrypted at the application layer.
- It is not horizontally safe for WebSocket scaling unless a shared broker is introduced.
- It does not include automated tests in the uploaded codebase.
- It does not include a full observability stack.
- The in-memory rate limiter is not suitable for multi-instance production deployments.
