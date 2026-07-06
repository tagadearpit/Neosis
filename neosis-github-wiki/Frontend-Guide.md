# Frontend Guide

## Overview

The frontend is a React 18 application built with Vite. It handles UI, authentication state, chat interactions, WebSocket communication, file upload, media preview, and WebRTC call UX.

## Important files

| File | Responsibility |
|---|---|
| `src/api.js` | Axios instance, backend URL, CSRF token fetching, CSRF retry logic. |
| `src/App.jsx` | Routes, protected route wrapper, global security alert UI. |
| `src/context/AuthContext.jsx` | Session verification through `/api/users/me`. |
| `src/components/Login.jsx` | Login screen and Google OAuth redirect. |
| `src/components/NeosisChat.jsx` | Main chat UI, STOMP client, media upload, voice note, WebRTC call handling. |
| `vite.config.js` | React, Tailwind, and PWA configuration. |
| `index.html` | CSP, font links, root mount, favicon. |

## Routing

Routes configured in `App.jsx`:

| Route | Behavior |
|---|---|
| `/login` | Public login page. |
| `/` | Protected chat route. |
| `/chat` | Protected chat route. |
| `*` | Redirects to `/login`. |

`ProtectedRoute` reads `isAuthenticated` from `AuthContext`. While verification is pending, it renders a loading screen. If verification fails, it redirects to `/login`.

## API client

`api.js` creates an Axios client:

```js
const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true
});
```

This is required because authentication is cookie/session based.

## CSRF handling

Before unsafe requests (`POST`, `PUT`, `PATCH`, `DELETE`), the client fetches `/api/csrf`, stores the token and header name, then injects the token into the request headers.

If a request fails with `403`, the client clears the cached CSRF token, fetches a new token, and retries once.

## Login flow

`Login.jsx` redirects users to:

```txt
${BACKEND_URL}/oauth2/authorization/google
```

After successful OAuth2 login, the backend redirects to:

```txt
${FRONTEND_URL}/chat
```

## WebSocket client

`NeosisChat.jsx` creates a STOMP client using SockJS:

```txt
${BACKEND_URL}/ws
```

It subscribes to:

- `/user/queue/messages`
- `/user/queue/typing`
- `/user/queue/signaling`
- `/user/queue/notifications`

It publishes to:

- `/app/chat.send`
- `/app/chat.typing`
- `/app/chat.signal`

## PWA configuration

`vite.config.js` uses `vite-plugin-pwa` with auto-update registration and the following app identity:

- Name: `Neosis Secure Chat`
- Short name: `Neosis`
- Display: `standalone`

## Content Security Policy

The frontend `index.html` includes a CSP. It restricts object embeds and frame ancestors, while allowing network/media resources needed for HTTPS, WSS, STUN, TURN, fonts, images, blobs, and media playback.

Production note: the current CSP still allows `'unsafe-inline'` for scripts and styles. That is common during development but should be tightened for stronger XSS resistance.
