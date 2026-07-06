# Neosis — Secure Real-Time Messaging Platform

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Backend-Spring%20Boot-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/WebSocket-STOMP-111827?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Auth-Google%20OAuth2-4285F4?style=for-the-badge&logo=google&logoColor=white" />
</p>

<p align="center">
  <b>Neosis</b> is a real-time web messaging application built with React, Spring Boot, WebSockets, MongoDB, Google OAuth2, media sharing, document upload, and WebRTC audio/video calls.
</p>

<p align="center">
  <a href="https://neosis-static-site.onrender.com">Live Frontend</a>
  ·
  <a href="https://neosis-433w.onrender.com">Live Backend</a>
</p>

---

## Overview

Neosis is designed as a modern secure messaging platform with a full-stack architecture.  
The frontend is built with React, Vite, Tailwind CSS, Framer Motion, STOMP, SockJS, and Axios.  
The backend is built with Spring Boot, Spring Security, OAuth2 Login, WebSocket/STOMP, MongoDB, GridFS, and REST APIs.

The app supports authenticated users, contact requests, real-time messaging, typing indicators, media/document uploads, voice notes, and WebRTC-based audio/video calls.

---

## Features

### Authentication

- Google OAuth2 login
- Cookie-based authenticated session
- Secure cross-origin frontend/backend communication
- CSRF-protected unsafe HTTP requests

### Real-Time Chat

- WebSocket/STOMP messaging
- One-to-one conversations
- Live message delivery
- Typing indicators
- Unread message counts
- Chat history loading

### Contact System

- Add users by email
- Send contact requests
- Accept pending requests
- Duplicate/self-request protection
- Contact-based chat access

### Media and Documents

- Image upload
- Video upload
- Audio/voice-note upload
- Document upload
- GridFS-backed file storage
- Server-side ownership checks for media access

### Calls

- Audio calls
- Video calls
- WebRTC signaling over WebSocket
- STUN support
- Optional TURN server configuration

### UI/UX

- Modern dark-mode interface
- Responsive chat layout
- Animated transitions with Framer Motion
- Emoji picker
- Attachment preview
- Terms and privacy acceptance modal
- Toast notifications

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Motion | Framer Motion |
| Icons | Lucide React |
| HTTP Client | Axios |
| WebSocket Client | STOMP + SockJS |
| PWA | vite-plugin-pwa |

### Backend

| Layer | Technology |
|---|---|
| Framework | Spring Boot |
| Security | Spring Security |
| Auth | Google OAuth2 |
| Realtime | WebSocket + STOMP |
| Database | MongoDB Atlas |
| File Storage | MongoDB GridFS |
| Build Tool | Maven |
| Runtime | Java 17 |

### Deployment

| Service | Platform |
|---|---|
| Frontend | Render Static Site |
| Backend | Render Web Service |
| Database | MongoDB Atlas |

---

## Live Deployment

### Frontend

```txt
https://neosis-static-site.onrender.com
