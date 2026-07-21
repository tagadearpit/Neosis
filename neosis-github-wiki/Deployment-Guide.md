# Deployment Guide

The project can be deployed as two services:

1. Frontend static site.
2. Backend Spring Boot web service.

The uploaded README references Render URLs, but the same model applies to Vercel/Netlify for frontend and Render/Railway/Fly.io for backend.

## Frontend deployment

Directory:

```txt
neosis-frontend
```

Install command:

```bash
npm install
```

Build command:

```bash
npm run build
```

Publish directory:

```txt
neosis-frontend/dist
```

Environment variable:

```env
VITE_BACKEND_URL=https://your-backend-domain.com
```

Important: rebuild the frontend after changing `VITE_BACKEND_URL`, because Vite injects environment variables at build time.

## Backend deployment

Directory:

```txt
neosis-backend
```

Build command without Docker:

```bash
mvn clean package -DskipTests
```

Run command:

```bash
java -jar target/neosis-backend-0.0.1-SNAPSHOT.jar
```

Required environment variables:

```env
MONGO_URI=mongodb+srv://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=https://your-frontend-domain.com
```

## Docker deployment

The backend includes a Dockerfile.

Build image:

```bash
cd neosis-backend
docker build -t neosis-backend .
```

Run container:

```bash
docker run -p 8080:8080 \
  -e MONGO_URI="mongodb+srv://..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  -e FRONTEND_URL="https://your-frontend-domain.com" \
  neosis-backend
```

## Google OAuth2 production setup

In Google Cloud Console, configure:

Authorized JavaScript origins:

```txt
https://your-frontend-domain.com
```

Authorized redirect URIs:

```txt
https://your-backend-domain.com/login/oauth2/code/google
```

## Render deployment notes

### Backend as Web Service

- Root directory: `neosis-backend`
- Runtime: Docker or Java
- Environment variables: set all backend variables
- Health check path: `/actuator/health/readiness`

### Frontend as Static Site

- Root directory: `neosis-frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_BACKEND_URL`

## Vercel frontend notes

For Vercel:

- Framework preset: Vite
- Root directory: `neosis-frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_BACKEND_URL`

Backend should still be hosted separately because this project uses a long-running Spring Boot service and WebSocket endpoint.

## Post-deployment checklist

- Frontend URL is configured as backend `FRONTEND_URL`.
- Backend URL is configured as frontend `VITE_BACKEND_URL`.
- Google OAuth redirect URI uses the deployed backend domain.
- MongoDB Atlas allows backend network access.
- Backend `/actuator/health/readiness` returns healthy.
- Frontend login redirects to Google.
- After login, browser returns to `/chat`.
- WebSocket connects to `/ws`.
- Contact request flow works between two accounts.
- File upload and media download work.
