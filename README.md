<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=waving&color=0:0f172a,45:0f766e,100:34d399&height=220&section=header&text=NEOSIS&fontSize=72&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Private%20real-time%20communication%20for%20the%20modern%20web&descAlignY=60&descSize=18"
    width="100%"
    alt="Neosis animated header"
  />
</p>

<p align="center">
  <a href="https://neosis-static-site.onrender.com">
    <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=20&duration=2800&pause=900&color=34D399&center=true&vCenter=true&width=760&lines=Real-time+messaging+with+Spring+Boot+and+React;Persistent+sessions%2C+media+sharing+and+WebRTC+calls;Designed+for+secure%2C+maintainable+production+deployment" alt="Neosis animated introduction" />
  </a>
</p>

<p align="center">
  <a href="https://neosis-static-site.onrender.com"><strong>🌐 Open Live Application</strong></a>
  &nbsp;•&nbsp;
  <a href="#-quick-start"><strong>🚀 Quick Start</strong></a>
  &nbsp;•&nbsp;
  <a href="#-deployment"><strong>☁️ Deployment</strong></a>
  &nbsp;•&nbsp;
  <a href="neosis-github-wiki/Home.md"><strong>📚 Documentation</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white" alt="Vite 7.3" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?logo=springboot&logoColor=white" alt="Spring Boot 3.5" />
  <img src="https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white" alt="Java 17" />
  <img src="https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white" alt="MongoDB 7" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker ready" />
  <img src="https://img.shields.io/badge/License-MIT-22C55E" alt="MIT License" />
</p>

---

## ✨ Overview

**Neosis** is a full-stack private messaging platform built for real-time conversations, media sharing, persistent authentication, and browser-based audio/video communication.

The application combines a responsive React PWA with a Spring Boot API, MongoDB persistence, STOMP/SockJS messaging, Google OAuth 2.0 authentication, GridFS media storage, and WebRTC calls.

Neosis is structured as two independently deployable services:

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion and PWA support
- **Backend:** Java 17, Spring Boot, Spring Security, WebSocket/STOMP and MongoDB

> [!IMPORTANT]
> Neosis protects traffic using HTTPS/WSS in production, but text messages and uploaded media are **not end-to-end encrypted**. The backend can access stored content. Do not describe this project as E2EE unless an independently reviewed client-side cryptographic protocol is added.

---

## 🧭 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Google OAuth Setup](#-google-oauth-setup)
- [Docker Setup](#-docker-setup)
- [Deployment](#-deployment)
- [API Overview](#-api-overview)
- [Security Model](#-security-model)
- [Validation and Testing](#-validation-and-testing)
- [Operational Notes](#-operational-notes)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Features

### 💬 Real-time messaging

- One-to-one text conversations
- STOMP messaging over SockJS/WebSocket
- Persistent MongoDB message history
- Typing indicators
- Read receipts
- Unread message counters
- Optimistic message rendering
- Server-backed conversation clearing

### 📎 Media and file sharing

- Images
- Videos
- Audio files
- Voice notes
- Documents
- Authenticated media retrieval
- Configurable upload-size restrictions
- MongoDB GridFS storage

### 📌 Conversation management

- Pin and unpin chats
- Mute and unmute conversations
- Clear messages for the current user
- Remove contacts
- Contact information panel
- Persistent per-user conversation preferences

### 👥 Contact workflow

- Send contact requests
- View pending requests
- Accept or reject requests
- View connected contacts
- Remove existing contacts

### 📞 Audio and video calls

- Browser-to-browser WebRTC calling
- Audio and video call modes
- STOMP-based signaling
- Incoming-call acceptance or rejection
- Busy-state handling
- Camera and microphone permission handling
- Configurable STUN/TURN infrastructure

### 🔐 Authentication and account controls

- Google OAuth 2.0 login
- Persistent MongoDB-backed sessions
- Secure HttpOnly session cookies
- Active-session inventory and per-device revocation
- Masked login history with 180-day retention
- New-device login alerts
- User profile editing
- Display-name and status updates
- Versioned privacy, notification, appearance and media settings
- Block and unblock controls with server-side enforcement
- Downloadable account-data and per-chat exports
- Secure logout
- Permanent account deletion
- User-scoped cleanup of messages, media, contacts, preferences and sessions

Password changes, two-factor authentication and passkeys are managed by Google because
Neosis does not store application passwords. The settings UI links users to the correct
Google Account security controls instead of duplicating credential management.

### ⚙️ Privacy and conversation settings

- Light, dark and system themes, accent color, font size and compact density
- Last-seen, online, profile, about, read-receipt and typing visibility controls
- Message and group-invite audience preferences
- High Privacy Mode with privacy-preserving defaults
- Desktop notification, preview and quiet-hours controls
- Media auto-load and link-preview controls
- Timed chat muting and disappearing text messages
- Chat search, export, clear, block and report actions

### 📱 User experience

- Responsive desktop and mobile interface
- Installable Progressive Web App
- Animated authentication/session loader
- Accessible confirmation dialogs
- Notification sounds
- Reduced-motion support
- SPA navigation with deployment-safe rewrites

### 🛡️ Production controls

- Session-backed CSRF protection
- Credentialed CORS allowlisting
- HTTP rate limiting
- WebSocket rate limiting
- Bean validation and centralized error handling
- Request IDs for correlating API responses with backend logs
- File-size, content-type, and file-signature restrictions
- Graceful shutdown
- Spring Boot health probes
- Non-root Docker runtime images
- Automated dependency updates with Dependabot

---

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite 7, Tailwind CSS 4, Framer Motion, Lucide React |
| State and routing | React Context, React Router |
| HTTP client | Axios |
| Real-time transport | STOMP, SockJS, WebSocket |
| Calls | WebRTC, STUN and optional TURN |
| PWA | Vite PWA plugin, service worker, web manifest |
| Backend | Java 17, Spring Boot 3.5 |
| Security | Spring Security, OAuth 2.0, CSRF, secure sessions |
| Data | MongoDB, Spring Data MongoDB, GridFS |
| Session store | Spring Session Data MongoDB |
| Operations | Actuator, Docker, Docker Compose, GitHub Actions |
| Hosting | Render Static Site + Render Web Service |

---

## 🏗️ System Architecture

```mermaid
flowchart LR
    U[User Browser / PWA]
    F[React + Vite Frontend]
    A[Spring Boot API]
    W[STOMP / SockJS Gateway]
    O[Google OAuth 2.0]
    M[(MongoDB)]
    G[(GridFS Media)]
    R[STUN / TURN]
    P[Peer Browser]

    U --> F
    F -->|HTTPS REST + Session Cookie| A
    F <-->|WSS Real-time Events| W
    W --> A
    A <-->|OAuth flow| O
    A --> M
    A --> G
    F <-->|WebRTC Media| P
    F -. ICE negotiation .-> R
    P -. ICE negotiation .-> R
```

### Request flow

1. The browser starts Google OAuth through the Spring Boot backend.
2. The backend creates a server-side session stored in MongoDB.
3. The browser receives only a secure HttpOnly session cookie.
4. REST APIs handle users, contacts, conversation preferences, history and uploads.
5. STOMP/WebSocket handles messages, typing events and WebRTC signaling.
6. WebRTC sends call media directly between peers where possible.
7. TURN relays call media when direct peer connectivity is unavailable.

---

## 📁 Project Structure

```text
Neosis/
├── .github/
│   ├── dependabot.yml
│   └── workflows/
├── neosis-frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── ContactInfoModal.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── NeosisChat.jsx
│   │   │   └── SettingsModal.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
├── neosis-backend/
│   ├── src/main/java/com/neosis/
│   │   ├── config/
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── model/
│   │   └── repository/
│   ├── src/main/resources/application.yml
│   ├── Dockerfile
│   └── pom.xml
├── neosis-github-wiki/
├── docker-compose.yml
├── render.yaml
├── SECURITY.md
├── LICENSE
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites

Install the following tools:

- **Java 17 or newer**
- **Maven 3.9 or newer**
- **Node.js 24 LTS** (Vite also supports Node 20.19+ and 22.12+)
- **npm**
- **MongoDB 7.x**, or a MongoDB Atlas database
- A **Google OAuth 2.0 Web Application** client

### 1. Clone the repository

```bash
git clone https://github.com/tagadearpit/Neosis.git
cd Neosis
```

### 2. Configure the backend

```bash
cd neosis-backend
cp .env.example .env
```

Edit `neosis-backend/.env`:

```env
PORT=8080
MONGO_URI=mongodb://localhost:27017/neosis
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
SESSION_TIMEOUT=24h
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAME_SITE=lax
```

Load the variables and start Spring Boot.

#### Linux or macOS

```bash
set -a
source .env
set +a
mvn spring-boot:run
```

#### Windows PowerShell

```powershell
$env:PORT="8080"
$env:MONGO_URI="mongodb://localhost:27017/neosis"
$env:FRONTEND_URL="http://localhost:5173"
$env:ALLOWED_ORIGINS="http://localhost:5173"
$env:SESSION_TIMEOUT="24h"
$env:GOOGLE_CLIENT_ID="your-google-client-id"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"
$env:SESSION_COOKIE_SECURE="false"
$env:SESSION_COOKIE_SAME_SITE="lax"
mvn spring-boot:run
```

The backend runs at:

```text
http://localhost:8080
```

### 3. Configure the frontend

Open another terminal:

```bash
cd neosis-frontend
cp .env.example .env
npm ci
npm run dev
```

Frontend environment:

```env
VITE_BACKEND_URL=http://localhost:8080
```

Open:

```text
http://localhost:5173
```

---

## 🔧 Environment Variables

### Backend variables

| Variable | Required | Example | Description |
|---|---:|---|---|
| `PORT` | No | `8080` | HTTP port. Render supplies this automatically. |
| `MONGO_URI` | Yes | `mongodb://localhost:27017/neosis` | MongoDB connection URI. |
| `FRONTEND_URL` | Yes | `https://neosis-static-site.onrender.com` | OAuth success redirect target, without a trailing slash. |
| `ALLOWED_ORIGINS` | Yes | `https://neosis-static-site.onrender.com` | Comma-separated exact browser origins allowed by CORS and WebSocket. |
| `SESSION_TIMEOUT` | No | `24h` | Server session and cookie lifetime. |
| `GOOGLE_CLIENT_ID` | Yes | `...apps.googleusercontent.com` | Google OAuth Web Application client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes | `secret` | Google OAuth client secret. Never expose this to the frontend. |
| `SESSION_COOKIE_SECURE` | Yes in production | `true` | Sends the session cookie only over HTTPS. |
| `SESSION_COOKIE_SAME_SITE` | Yes | `none` | Use `none` when frontend and backend use separate domains. |

### Frontend build variables

| Variable | Required | Example | Description |
|---|---:|---|---|
| `VITE_BACKEND_URL` | Yes | `https://neosis-api.onrender.com` | Public backend URL, without a trailing slash. |
| `VITE_TURN_URL` | Recommended | `turn:turn.example.com:3478` | TURN server address for reliable calls. |
| `VITE_TURN_USERNAME` | With TURN | `username` | TURN username. |
| `VITE_TURN_CREDENTIAL` | With TURN | `credential` | TURN credential. Visible in the browser bundle. |

> [!CAUTION]
> Every variable beginning with `VITE_` is compiled into the public frontend bundle. Never place database passwords, OAuth client secrets, private API keys or administrative credentials in a `VITE_` variable.

---

## 🔑 Google OAuth Setup

Create an OAuth 2.0 **Web Application** in Google Cloud Console.

### Local development

Authorized JavaScript origin:

```text
http://localhost:5173
```

Authorized redirect URI:

```text
http://localhost:8080/login/oauth2/code/google
```

### Production

Authorized JavaScript origin:

```text
https://YOUR-FRONTEND-HOST
```

Authorized redirect URI:

```text
https://YOUR-BACKEND-HOST/login/oauth2/code/google
```

The redirect URI must match exactly. A different hostname, path, protocol or trailing slash can cause `redirect_uri_mismatch`.

---

## 🐳 Docker Setup

Create a root `.env` file:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Build and start the complete stack:

```bash
docker compose up --build
```

Services:

| Service | Address |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:8080` |
| MongoDB | Internal Docker network |

Stop the stack:

```bash
docker compose down
```

Remove the local MongoDB volume as well:

```bash
docker compose down -v
```

> [!WARNING]
> The `-v` option permanently removes the Docker Compose database volume.

---

## ☁️ Deployment

Neosis is designed to run as two Render services from the same repository.

The root [`render.yaml`](render.yaml) defines both services, security headers, SPA rewrites,
health checks, and deploy-after-CI behavior. Review its secret placeholders before applying
the Blueprint to an existing Render account.

### Frontend — Render Static Site

| Setting | Value |
|---|---|
| Service type | Static Site |
| Root directory | `neosis-frontend` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Environment variable | `VITE_BACKEND_URL=https://YOUR-BACKEND.onrender.com` |

Add this SPA rewrite:

| Source | Destination | Action |
|---|---|---|
| `/*` | `/index.html` | Rewrite |

### Backend — Render Web Service

| Setting | Value |
|---|---|
| Service type | Web Service |
| Runtime | Docker |
| Root directory | `neosis-backend` |
| Dockerfile path | `./Dockerfile` |
| Health check path | `/actuator/health/readiness` |
| Build command | Leave empty |
| Start command | Leave empty |

Required production variables:

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/neosis?retryWrites=true&w=majority
FRONTEND_URL=https://YOUR-FRONTEND.onrender.com
ALLOWED_ORIGINS=https://YOUR-FRONTEND.onrender.com
SESSION_TIMEOUT=24h
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=none
```

### Recommended deployment order

1. Deploy the backend.
2. Copy the backend URL.
3. Add it as `VITE_BACKEND_URL` on the frontend.
4. Deploy the frontend.
5. Copy the frontend URL.
6. Add it as `FRONTEND_URL` on the backend.
7. Configure the production Google OAuth origin and callback URI.
8. Redeploy both services.

---

## 🔌 API Overview

All user-scoped endpoints require an authenticated session unless noted otherwise.

### Authentication and security

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/oauth2/authorization/google` | Start Google OAuth login |
| `GET` | `/login/oauth2/code/google` | Google OAuth callback |
| `GET` | `/api/csrf` | Obtain the CSRF token |
| `POST` | `/logout` | End the authenticated session |

### Users and settings

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/users/me` | Read the current profile |
| `PATCH` | `/api/users/me` | Update display name or status |
| `PATCH` | `/api/users/me/preferences` | Update application preferences |
| `DELETE` | `/api/users/me` | Permanently delete the account |
| `POST` | `/api/users/accept-terms` | Record terms acceptance |
| `POST` | `/api/users/presence` | Refresh the current user's presence |
| `GET` | `/api/settings` | Read versioned account settings |
| `PATCH` | `/api/settings` | Update privacy, notification, appearance, media or security settings |
| `GET` | `/api/security/sessions` | List active login sessions |
| `DELETE` | `/api/security/sessions/{id}` | Revoke one active session |
| `DELETE` | `/api/security/sessions` | Revoke all other sessions |
| `GET` | `/api/security/login-history` | Read recent masked login events |

### Contacts

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/contacts/request` | Send a contact request |
| `GET` | `/api/contacts/pending` | List pending requests |
| `POST` | `/api/contacts/accept` | Accept a request |
| `POST` | `/api/contacts/reject` | Reject a request |

### Conversations and messages

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/conversations` | List conversation summaries |
| `PATCH` | `/api/conversations/{contactEmail}` | Update pin or mute preference |
| `DELETE` | `/api/conversations/{contactEmail}/messages` | Clear the conversation for the current user |
| `DELETE` | `/api/conversations/{contactEmail}` | Remove a contact/conversation |
| `GET` | `/api/messages/history/{friendEmail}` | Load message history |
| `POST` | `/api/messages/read/{friendEmail}` | Mark messages as read |
| `GET` | `/api/messages/export/{friendEmail}` | Download a bounded text chat export |
| `POST` | `/api/chat/upload` | Upload authenticated media |
| `GET` | `/api/chat/media/{id}` | Retrieve authorized media |

### Safety and data

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/safety/blocked` | List blocked users |
| `POST` | `/api/safety/blocked/{email}` | Block a user |
| `DELETE` | `/api/safety/blocked/{email}` | Unblock a user |
| `POST` | `/api/safety/reports` | Submit a structured abuse report |
| `GET` | `/api/data/export` | Download the current user's account data |
| `DELETE` | `/api/data/chats` | Clear all chats for the current user |

### WebSocket destinations

| Destination | Purpose |
|---|---|
| `/app/chat.send` | Send a real-time chat message |
| `/app/chat.typing` | Publish a typing state |
| `/app/chat.signal` | Exchange WebRTC signaling events |

See [`neosis-github-wiki/API-Reference.md`](neosis-github-wiki/API-Reference.md) for additional details.

---

## 🛡️ Security Model

Neosis includes several baseline production controls:

- OAuth authentication instead of application-managed passwords
- Verified Google email requirement
- Server-side sessions persisted in MongoDB
- Per-session revocation and masked security-event history
- HttpOnly session cookies
- `Secure` and `SameSite` cookie configuration
- Session-backed CSRF tokens
- Explicit credentialed CORS origin
- Request validation
- Centralized API error responses
- Bounded HTTP and WebSocket rate limiting
- Server-side terms enforcement for API and realtime access
- Allowlisted WebSocket subscriptions and application destinations
- Authenticated media endpoints
- Media ownership checks
- Bidirectional block enforcement across contacts, messages, media and calls
- Privacy-setting enforcement for receipts, typing, presence and messaging
- TTL cleanup for disappearing messages and login-history retention
- File-size, content-type, and file-signature restrictions
- Non-root Docker containers
- Health endpoints with restricted details
- Secure Nginx headers for containerized frontend delivery

### Current security boundary

| Area | Current behavior |
|---|---|
| Network transport | HTTPS/WSS in production |
| Session credential | HttpOnly secure cookie |
| Stored text messages | Plaintext application data in MongoDB |
| Stored media | Application-accessible GridFS objects |
| WebRTC media | DTLS-SRTP transport |
| End-to-end encryption | Not implemented |
| Malware scanning | Not implemented |

For public deployment at scale, add malware scanning, abuse controls, security-event auditing, retention policies, secret rotation and an external penetration test.

---

## ✅ Validation and Testing

### Frontend

```bash
cd neosis-frontend
npm ci
npm run build
```

### Backend

```bash
cd neosis-backend
mvn clean verify
```

### Docker

```bash
docker compose build --no-cache
docker compose up
```

### Manual smoke-test checklist

- [ ] Google login succeeds
- [ ] Session remains valid after a browser refresh
- [ ] Logout invalidates the session
- [ ] Profile settings persist
- [ ] Contact requests can be accepted and rejected
- [ ] Text messages arrive in real time
- [ ] Message history reloads correctly
- [ ] Read receipts and unread counters update
- [ ] Pin and mute settings persist
- [ ] Chat clearing remains cleared after reload
- [ ] Media upload and download permissions are enforced
- [ ] Audio and video calls work across separate networks
- [ ] Account deletion removes user-owned data
- [ ] `/actuator/health/readiness` reports a healthy backend

---

## 📊 Operational Notes

### Health endpoint

```text
GET /actuator/health/readiness
```

Use this endpoint for Render health checks and container probes.

### Database

- Use MongoDB Atlas or a managed replica set in production.
- Restrict the database user to the Neosis database.
- Enable backups and test restoration regularly.
- Keep `MONGO_URI` only in backend secret storage.

### Calls

Public STUN servers alone are not sufficient for reliable WebRTC connectivity. Configure TURN for users behind mobile carrier NAT, enterprise firewalls or restrictive Wi-Fi networks.

### Scaling limitation

The current embedded STOMP broker and in-memory rate-limit buckets are suitable for a **single backend instance**.

Before horizontal scaling, replace them with shared infrastructure such as:

- RabbitMQ STOMP relay or another external broker
- Redis-backed/distributed rate limiting
- Shared presence and call-state management
- Centralized logs, metrics and traces

### Free hosting behavior

A sleeping or cold-starting backend can delay login, WebSocket connection, presence and incoming-call behavior. Use an always-on backend instance for time-sensitive real-time communication.

---

## 🧯 Troubleshooting

<details>
<summary><strong>Login remains on “Verifying secure session”</strong></summary>

Check:

1. `VITE_BACKEND_URL` points to the correct HTTPS backend.
2. `FRONTEND_URL` exactly matches the deployed frontend origin.
3. `SESSION_COOKIE_SECURE=true` in production.
4. `SESSION_COOKIE_SAME_SITE=none` for separate Render domains.
5. Google OAuth redirect URI points to the backend callback.
6. MongoDB is reachable and the backend health endpoint is healthy.
7. The browser is not blocking third-party/cross-site cookies.

After changing a Vite variable, rebuild the frontend because `VITE_` values are compile-time variables.

</details>

<details>
<summary><strong>Google reports redirect_uri_mismatch</strong></summary>

Add the exact callback URI in Google Cloud Console:

```text
https://YOUR-BACKEND-HOST/login/oauth2/code/google
```

The callback belongs to the backend, not the frontend.

</details>

<details>
<summary><strong>Directly opening /login or another route returns 404</strong></summary>

Add the Render Static Site rewrite:

```text
/*  →  /index.html
```

Set the action to **Rewrite**, not Redirect.

</details>

<details>
<summary><strong>Messages do not update in real time</strong></summary>

Check the browser Network tab for the SockJS/WebSocket connection and confirm:

- Backend service is awake and healthy
- CORS origin matches the frontend
- Session cookie is present
- Proxy allows WebSocket upgrades
- No stale PWA bundle is using an old backend URL

</details>

<details>
<summary><strong>Audio or video calls work only on some networks</strong></summary>

Configure `VITE_TURN_URL`, `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL`. Direct peer connectivity can fail behind CGNAT and enterprise firewalls.

</details>

<details>
<summary><strong>The deployed frontend still shows an old version</strong></summary>

The PWA service worker may have cached older assets. Use a hard refresh, clear site data, or trigger a Render **Clear build cache & deploy** operation.

</details>

---

## 🗺️ Roadmap

Potential production improvements:

- [ ] Audited end-to-end encryption protocol
- [ ] Multi-device key and session management
- [ ] Group conversations
- [ ] Message reactions and replies
- [ ] Edit and delete individual messages
- [ ] Full-text conversation search
- [ ] Push notifications
- [ ] Temporary TURN credentials
- [ ] Malware scanning for uploads
- [ ] Object storage/CDN media pipeline
- [ ] External STOMP broker
- [ ] Redis-backed distributed rate limiting
- [ ] OpenTelemetry traces and centralized metrics
- [ ] Administrative abuse-management controls
- [ ] Automated end-to-end browser tests

---

## 🤝 Contributing

1. Fork the repository.
2. Create a focused branch:

```bash
git checkout -b feature/your-change
```

3. Keep frontend and backend changes backward-compatible where possible.
4. Add validation and error handling for new API inputs.
5. Run the production checks:

```bash
cd neosis-frontend && npm ci && npm run build
cd ../neosis-backend && mvn clean verify
```

6. Commit using a clear message:

```bash
git commit -m "Add concise description of change"
```

7. Push the branch and open a pull request.

Pull requests should explain behavior changes, security impact, migration requirements, test coverage and operational risks.

---

## 📚 Additional Documentation

- [Project overview](neosis-github-wiki/Project-Overview.md)
- [System architecture](neosis-github-wiki/System-Architecture.md)
- [Frontend guide](neosis-github-wiki/Frontend-Guide.md)
- [Backend guide](neosis-github-wiki/Backend-Guide.md)
- [Authentication and security](neosis-github-wiki/Authentication-and-Security.md)
- [WebSocket and real-time behavior](neosis-github-wiki/WebSocket-and-Realtime.md)
- [Environment variables](neosis-github-wiki/Environment-Variables.md)
- [Deployment guide](neosis-github-wiki/Deployment-Guide.md)
- [Troubleshooting](neosis-github-wiki/Troubleshooting.md)
- [Production risks and roadmap](neosis-github-wiki/Production-Risks-and-Roadmap.md)
- [Production Audit Report](PRODUCTION_AUDIT.md)

---

## 🗺️ Grounded Feature Roadmap & Prioritized Development Order

Neosis has a comprehensive feature expansion roadmap grounded against its active codebase and MongoDB schemas:

### Tier 1 — Finish Stubbed UI Placeholders
- **Profile Photo Upload**: Wire disabled privacy-tab selector to `/api/chat/upload/avatar` and add `profilePhotoUrl` to `User`.
- **Group Chats**: Add `Group` / `Room` schema, `conversationId` to messages, group STOMP routing, and admin controls.

### Tier 2 — High-Value Core Messaging (Recommended Starting Order)
1. ⭐ **Reply to Messages**: Quote preview above bubbles, swipe-to-reply, click-to-scroll (`replyToMessageId` in `ChatMessage`).
2. ⭐ **Message Reactions**: ❤️ double-click, emoji picker popover, multiple reactions, live WS broadcast (`reactions` map in `ChatMessage`).
3. ⭐ **Edit & Delete Messages**: 15-minute edit window with "Edited" label, "Delete for everyone", and WS reconciliation.
4. ⭐ **Search Within Chats**: Search images, files, links, dates, and text with keyword highlighting.
5. ⭐ **Media Gallery & Improved Viewer**: Fullscreen lightbox with zoom, swipe, download, and categorized chat media tabs.
6. ⭐ **Mentions & Group Enhancements**: `@username` tags, polls, events, and threaded replies.
7. ⭐ **AI Assistance**: AI chat summary, smart replies, instant translation, tone rewrite, and meeting notes.
8. ⭐ **End-to-End Encryption / 2FA**: Client-side key generation and multi-device authentication.
9. ⭐ **Performance & Polish**: Virtualized message lists, offline send queue with IndexedDB, push notifications, and custom theming.

For complete architectural details and residual risk mitigations, see [`PRODUCTION_AUDIT.md`](file:///d:/CandyRobot/Neosis-main/PRODUCTION_AUDIT.md) and [`neosis-github-wiki/Production-Risks-and-Roadmap.md`](file:///d:/CandyRobot/Neosis-main/neosis-github-wiki/Production-Risks-and-Roadmap.md).

---

## 🔄 Recent Changes

### Frontend Bug & Animation Audit (July 2026)

A comprehensive frontend audit identified and fixed the following issues:

#### 🔴 Critical
- **Terms & Conditions gate (`hasAcceptedTC`) now syncs with the backend** — Previously, the T&C modal would re-appear on every page refresh even for users who had already accepted terms, blocking WebSocket connection, sidebar loading, and presence heartbeat until the user clicked "Accept" again. The state is now initialized from `authUser.termsAccepted` and kept in sync.

#### 🟠 Animations & Performance
- **Message bubbles optimized** — Removed expensive `rotateX` and `filter: blur()` CSS properties from message entrance animations. Removed unnecessary `layout` prop that was causing FLIP recalculations across all message siblings. Added proper `exit` variant for smooth message removal.
- **History load no longer replays 100 entrance animations** — A `hasRenderedHistoryRef` pattern ensures only newly-appended messages animate in; the initial history batch renders without entrance animation.
- **Contact list exit animation** — Wrapped contact rows in `<AnimatePresence>` with a slide-out `exit` variant so blocking/removing a contact animates smoothly.
- **Dropdown transform-origin** — Notification, settings, and more-menu dropdowns now scale from `top right` (their trigger button) instead of center.
- **Online presence pulse ring wired up** — The existing `.chat-pulse-avatar` CSS class (previously orphaned) is now applied to contact avatars and chat header avatars when the contact is online.

#### 🟡 Code Quality
- **Dead CSS removed** — Orphaned `@keyframes shimmer` and `@keyframes blink` deleted. The `.chat-pulse-avatar` keyframe was fixed (was referencing nonexistent `ping` animation).
- **Dead emoji button code removed** — Empty `if (!showEmojiPicker && attachmentPreview) {}` no-op block cleaned up.
- **Shared AudioContext** — `playNotificationTone` now reuses a single `AudioContext` instance instead of creating (and leaking) a new one per notification.
- **Call failed toast** — `onconnectionstatechange` `'failed'` branch now shows a user-facing toast ("Call could not be connected.") before cleaning up, instead of silently snapping back to idle.

#### ♿ Accessibility
- **`useReducedMotion()` support** — All Framer Motion components (`NeosisChat`, `SettingsModal`, `ConfirmDialog`, `ContactInfoModal`) now respect the OS-level `prefers-reduced-motion` setting. Previously only the plain-CSS loading screen honored it.


---

## 📄 License

This project is distributed under the **MIT License**. See [`LICENSE`](LICENSE) for the complete license text.

---

## 👨‍💻 Maintainer


**Arpit Tagade**  
Full-Stack AI Engineer and hardware developer

<p>
  <a href="https://github.com/tagadearpit">
    <img src="https://img.shields.io/badge/GitHub-tagadearpit-181717?logo=github&logoColor=white" alt="Arpit Tagade on GitHub" />
  </a>
  <a href="https://neosis-static-site.onrender.com">
    <img src="https://img.shields.io/badge/Live-Neosis-34D399?logo=render&logoColor=white" alt="Open Neosis" />
  </a>
</p>

<p align="center">
  <strong>Built for maintainable real-time communication—not just a UI demo.</strong>
</p>

<p align="center">
  <a href="#-overview">⬆ Back to top</a>
</p>

<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=waving&color=0:34d399,55:0f766e,100:0f172a&height=120&section=footer"
    width="100%"
    alt="Neosis footer"
  />
</p>
