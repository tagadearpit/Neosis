# System Architecture

## High-level flow

```txt
Browser / React SPA
   |
   | HTTPS + cookies + CSRF token
   v
Spring Boot Backend
   |-- REST APIs for users, contacts, history, uploads
   |-- STOMP over SockJS at /ws
   |-- OAuth2 login with Google
   |
   v
MongoDB
   |-- users
   |-- chat_requests
   |-- messages
   |-- GridFS files + metadata
```

## Runtime components

### Frontend

The frontend is responsible for:

- Rendering login and chat screens.
- Starting Google OAuth2 login by redirecting to `/oauth2/authorization/google`.
- Maintaining authenticated API calls with `withCredentials: true`.
- Fetching CSRF tokens before unsafe HTTP requests.
- Connecting to the backend WebSocket endpoint through SockJS.
- Publishing chat, typing, and call signaling events.
- Subscribing to user-specific queues.

Key files:

- `neosis-frontend/src/api.js`
- `neosis-frontend/src/App.jsx`
- `neosis-frontend/src/components/Login.jsx`
- `neosis-frontend/src/components/NeosisChat.jsx`
- `neosis-frontend/src/context/AuthContext.jsx`

### Backend

The backend is responsible for:

- Google OAuth2 login.
- Session and CSRF enforcement.
- User creation and lookup.
- Contact request lifecycle.
- Message validation, storage, and delivery.
- Media upload and access control.
- WebSocket/STOMP routing.
- Basic API rate limiting.

Key files:

- `neosis-backend/src/main/java/com/neosis/config/SecurityConfig.java`
- `neosis-backend/src/main/java/com/neosis/config/WebSocketConfig.java`
- `neosis-backend/src/main/java/com/neosis/controller/ChatController.java`
- `neosis-backend/src/main/java/com/neosis/controller/ContactController.java`
- `neosis-backend/src/main/java/com/neosis/controller/MessageController.java`
- `neosis-backend/src/main/java/com/neosis/controller/UserController.java`

## WebSocket architecture

```txt
Client publishes:
/app/chat.send
/app/chat.typing
/app/chat.signal

Backend sends to user queues:
/user/queue/messages
/user/queue/typing
/user/queue/signaling
/user/queue/notifications
```

The backend uses Spring's simple in-memory broker:

```java
config.enableSimpleBroker("/topic", "/queue");
config.setApplicationDestinationPrefixes("/app");
config.setUserDestinationPrefix("/user");
```

## Data ownership model

Most sensitive actions are scoped by authenticated email:

- Contacts can only chat after an accepted `ChatRequest` exists.
- Messages are assigned server-side sender email from the authenticated principal.
- Media files are stored with sender and recipient metadata.
- Media downloads are allowed only for the sender or recipient.

## Production scalability concern

The current simple broker and in-memory rate limiter are single-instance friendly. For multiple backend instances, introduce:

- A shared STOMP broker relay such as RabbitMQ or ActiveMQ.
- Redis-backed distributed rate limiting.
- Sticky sessions or externalized session storage.
- Centralized logging and metrics.
