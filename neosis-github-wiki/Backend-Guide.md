# Backend Guide

## Overview

The backend is a Spring Boot 3.5 application running on Java 17. It provides REST APIs, OAuth2 login, CSRF protection, WebSocket/STOMP messaging, MongoDB persistence, and GridFS file storage.

## Important files

| File | Responsibility |
|---|---|
| `NeosisApplication.java` | Main Spring Boot entrypoint and Mongo auditing enablement. |
| `SecurityConfig.java` | CORS, CSRF, OAuth2 login, session principal normalization. |
| `WebSocketConfig.java` | STOMP endpoint, simple broker, WebSocket limits. |
| `RateLimitFilter.java` | Basic in-memory rate limiting for selected endpoints. |
| `ChatController.java` | Uploads, media access, message send, typing, WebRTC signaling. |
| `ContactController.java` | Contact request create, pending list, accept, friends list. |
| `MessageController.java` | Chat history. |
| `UserController.java` | Current user, terms acceptance, user lookup. |
| `GlobalExceptionHandler.java` | Standard error responses for upload and validation failures. |
| `application.yml` | Server, session cookie, upload, MongoDB, OAuth2, actuator config. |

## Application defaults

From `application.yml`:

```yaml
server:
  port: 8080
  servlet:
    session:
      cookie:
        same-site: none
        secure: true
```

Uploads:

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 20MB
      max-request-size: 25MB
```

MongoDB:

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGO_URI:mongodb://localhost:27017/neosis}
      auto-index-creation: true
```

OAuth2:

```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope:
              - email
              - profile
```

## REST security model

- `OPTIONS /**` is permitted for CORS preflight.
- `/`, `/login`, `/ws/**`, `/api/csrf`, and `/api/users/me` are permitted.
- All other requests require authentication.
- Unsafe REST requests require CSRF token except OAuth login and WebSocket paths.

## Principal normalization

After Google OAuth2 success, the backend replaces the authentication principal name with the user's email. This matters because `convertAndSendToUser()` uses the principal name for user-specific WebSocket routing.

## File handling

The backend stores uploaded files in GridFS with metadata:

- `publicId`
- `senderEmail`
- `recipientEmail`
- `originalFilename`
- `contentType`
- `size`
- `createdAt`

The public URL is returned as:

```txt
/api/chat/media/{publicId}
```

## Docker deployment

The backend includes a multi-stage Dockerfile:

```txt
Build stage: maven:3.9.6-eclipse-temurin-17
Runtime stage: eclipse-temurin:17-jre-alpine
```

The container runs as a non-root `app` user and exposes port `8080`.

## Actuator

The backend exposes health and info endpoints:

```txt
/actuator/health/readiness
/actuator/info
```

Health probes are enabled.
