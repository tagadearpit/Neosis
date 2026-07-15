# Validation Report

Date: 2026-07-10

## Passed in the delivery environment

- `npm run build` completed successfully with Vite and generated the production PWA bundle.
- A clean `npm ci --offline --no-audit --no-fund` completed from `package-lock.json`.
- `npm audit --offline` reported zero vulnerabilities in the local advisory cache. This is not a substitute for a current CI/SCA scan with network access.
- `package.json`, `package-lock.json`, `pom.xml`, `application.yml`, Docker Compose, and GitHub workflow YAML parsed successfully.
- Source and configuration scans found no embedded private keys, live OAuth secrets, or production database credentials.
- A Java 17 syntax pass found no syntax-level diagnostics; unresolved diagnostics were expected because Spring/Mongo/Jakarta dependencies were unavailable to `javac`.

## Environment limitation

Maven and Docker were not installed in the delivery environment, and outbound dependency resolution was unavailable. Therefore, `mvn clean verify`, Spring context startup, MongoDB integration, OAuth browser login, STOMP delivery, media streaming, and WebRTC calls could not be executed end-to-end here.

The repository includes two reproducible backend compile gates:

```bash
cd neosis-backend
mvn clean verify
```

and:

```bash
docker compose build backend
```

The GitHub Actions workflow runs `mvn -B clean verify` and the frontend production build on pushes and pull requests.

## Required pre-launch verification

Run the following against a staging environment using production-like HTTPS origins:

1. Google OAuth login, refresh/restart persistence, logout, and cookie attributes.
2. Contact request, accept, reject, remove, and re-add flows.
3. Text/media/voice-note messaging, unauthorized media access, read receipts, clear-for-me, pin, and mute.
4. Audio/video calls across different mobile and enterprise networks with TURN configured.
5. Account deletion with database/GridFS verification and deliberate interruption/retry testing.
6. Live dependency and container image vulnerability scanning, backup restore, load testing, and penetration testing.
