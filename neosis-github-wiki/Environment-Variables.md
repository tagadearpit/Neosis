# Environment Variables

## Backend variables

Defined or consumed through `application.yml` and Spring Security OAuth2 configuration.

| Variable | Required | Example | Purpose |
|---|---:|---|---|
| `MONGO_URI` | Yes | `mongodb+srv://...` | MongoDB database connection string. |
| `GOOGLE_CLIENT_ID` | Yes | `123.apps.googleusercontent.com` | Google OAuth2 client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes | `GOCSPX-...` | Google OAuth2 client secret. |
| `FRONTEND_URL` | Yes in production | `https://neosis-static-site.onrender.com` | Allowed frontend origin and OAuth success redirect target. |
| `ALLOWED_ORIGINS` | Yes in production | `https://neosis-static-site.onrender.com` | Comma-separated CORS and WebSocket origin allowlist. |
| `SESSION_TIMEOUT` | No | `24h` | Server-side session and cookie lifetime. |
| `SESSION_COOKIE_SECURE` | Yes in production | `true` | Restricts the session cookie to HTTPS. |
| `SESSION_COOKIE_SAME_SITE` | Yes | `none` | Allows the cookie across separate frontend/backend origins. |
| `PORT` | Platform-dependent | `8080` | Runtime port. Spring config defaults to `8080`. |

## Frontend variables

| Variable | Required | Example | Purpose |
|---|---:|---|---|
| `VITE_BACKEND_URL` | Recommended | `https://neosis-433w.onrender.com` | Backend API and WebSocket base URL. |

If `VITE_BACKEND_URL` is missing, the frontend falls back to:

```txt
https://neosis-433w.onrender.com
```

## Cookie and CORS relationship

The backend allows credentials and restricts origins to the exact, comma-separated
values in `ALLOWED_ORIGINS`. If it is omitted, the value falls back to `FRONTEND_URL`.

For production cross-origin cookies to work:

- Backend must be served over HTTPS.
- Session cookie must be `Secure`.
- Session cookie must be `SameSite=None`.
- Frontend Axios must use `withCredentials: true`.
- CORS must include the exact frontend origin, not `*`.

The code already follows this model, but a wrong `FRONTEND_URL` will break login, sessions, or WebSocket connection.

## Do not commit secrets

Never commit these values to GitHub:

- `GOOGLE_CLIENT_SECRET`
- MongoDB username/password
- MongoDB Atlas URI
- Any private deployment tokens

Use platform environment variables on Render, Vercel, Railway, or other hosting providers.
