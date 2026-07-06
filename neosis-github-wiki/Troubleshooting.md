# Troubleshooting

## Login redirects but user is still unauthenticated

Likely causes:

- `FRONTEND_URL` does not exactly match the deployed frontend origin.
- Browser blocks third-party/cross-site cookies.
- Backend is not HTTPS in production while cookie is `Secure=true`.
- Google OAuth redirect URI is wrong.
- Frontend `VITE_BACKEND_URL` points to the wrong backend.

Checks:

```txt
GET /api/users/me
GET /api/csrf
```

Both should target the intended backend domain.

## Google OAuth error: redirect_uri_mismatch

Fix the authorized redirect URI in Google Cloud Console:

```txt
https://your-backend-domain.com/login/oauth2/code/google
```

For local development:

```txt
http://localhost:8080/login/oauth2/code/google
```

## CSRF 403 on POST requests

Likely causes:

- Frontend is not calling `/api/csrf`.
- Session cookie is missing.
- CORS credentials are blocked.
- Backend and frontend origins do not match CORS configuration.

Check that Axios uses:

```js
withCredentials: true
```

Check that the request includes:

```txt
X-XSRF-TOKEN: <token>
```

## WebSocket connection fails

Likely causes:

- `VITE_BACKEND_URL` is wrong.
- Backend CORS allowed origins do not include frontend origin.
- Hosting platform does not support WebSockets on the selected service type.
- Session cookie is missing after OAuth login.

Expected endpoint:

```txt
${BACKEND_URL}/ws
```

## Contact request fails with 404

The receiver must already exist in the Neosis database. A user is created when they log in with Google at least once.

## File upload returns 413 or upload too large

Current limits:

- Application limit: 15 MB.
- Multipart file limit: 20 MB.
- Multipart request limit: 25 MB.

Keep files under 15 MB.

## File upload returns unsupported file type

Allowed categories:

- Images
- Videos
- Audio
- PDF, TXT, CSV, DOC, DOCX, XLS, XLSX, PPT, PPTX

The backend relies on sanitized content type and file extension fallback. Some browsers may send unexpected content types for certain files.

## Messages do not appear

Check:

- Both users are accepted contacts.
- WebSocket is connected.
- Client publishes to `/app/chat.send`.
- Backend sends to `/user/queue/messages`.
- Authenticated principal name is the user's email.

## Calls do not connect

Check:

- Both users are accepted contacts.
- Browser permissions allow microphone/camera.
- Signaling messages are received on `/user/queue/signaling`.
- STUN works on the current network.
- Add TURN server for restrictive NAT/mobile networks.

## MongoDB connection failure

Check:

- `MONGO_URI` is correct.
- MongoDB Atlas credentials are URL-encoded.
- Atlas network access allows the backend provider.
- Database user has read/write permissions.

## Production frontend shows old backend URL

Vite injects env variables at build time. Update `VITE_BACKEND_URL` and rebuild/redeploy the frontend.
