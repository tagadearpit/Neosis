# Neosis Wiki

Neosis is a secure real-time messaging platform built with a React/Vite frontend and a Spring Boot backend. It supports Google OAuth2 login, authenticated contact requests, one-to-one chat, media and document uploads, typing indicators, user-specific WebSocket queues, and WebRTC audio/video signaling.

## Wiki navigation

- [[Project Overview]]
- [[System Architecture]]
- [[Local Development]]
- [[Environment Variables]]
- [[Frontend Guide]]
- [[Backend Guide]]
- [[Authentication and Security]]
- [[API Reference]]
- [[WebSocket and Realtime]]
- [[Media Uploads and Storage]]
- [[Database Schema]]
- [[Deployment Guide]]
- [[Troubleshooting]]
- [[Production Risks and Roadmap]]
- [[How to Upload This Wiki]]

## Repository layout

```txt
Neosis-main/
├── README.md
├── LICENSE
├── neosis-frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── context/AuthContext.jsx
│       └── components/
│           ├── Login.jsx
│           └── NeosisChat.jsx
└── neosis-backend/
    ├── Dockerfile
    ├── pom.xml
    └── src/main/
        ├── java/com/neosis/
        │   ├── NeosisApplication.java
        │   ├── config/
        │   ├── controller/
        │   ├── model/
        │   └── repository/
        └── resources/application.yml
```

## Core stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Realtime client | STOMP.js, SockJS |
| Backend | Spring Boot 3.2.4, Java 17 |
| Security | Spring Security, Google OAuth2, CSRF cookie token, CORS allowlist |
| Database | MongoDB |
| File storage | MongoDB GridFS |
| Realtime server | Spring WebSocket/STOMP simple broker |
| Calls | WebRTC peer connection with WebSocket signaling |
| Deployment target | Render static site + Render web service, or equivalent platforms |

## Important security note

The code implements authenticated messaging, access checks, CSRF protection, CORS restrictions, file ownership checks, and rate limiting for selected endpoints. It does **not** implement true end-to-end encryption because messages and media metadata are processed and stored by the backend. Do not describe the project as end-to-end encrypted unless client-side encryption is added.
