# Security Policy

## Supported version

Security fixes are applied to the latest commit on `main`.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's private
vulnerability reporting option in the repository Security tab when it is available,
or contact the repository owner privately through their GitHub profile.

Include the affected endpoint or component, reproduction steps, impact, and any
suggested mitigation. Do not access other users' data, degrade the deployed service,
or publish exploit details before a fix is available.

## Security boundary

Neosis uses OAuth, server-side sessions, CSRF protection, origin allowlists, scoped
WebSocket destinations, access-controlled media, and request rate limits. Messages
and files are encrypted in transit but are not end-to-end encrypted; the backend and
database operators can access stored content.

Production operators are responsible for secret management, MongoDB access controls,
backups, monitoring, TURN credentials, dependency updates, and incident response.
