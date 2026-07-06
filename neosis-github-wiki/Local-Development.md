# Local Development

## Prerequisites

- Java 17
- Maven 3.9+
- Node.js 20.19.0 or compatible with the frontend `engines` field
- MongoDB local instance or MongoDB Atlas connection string
- Google OAuth2 credentials

## 1. Clone the repository

```bash
git clone https://github.com/<your-username>/Neosis.git
cd Neosis
```

## 2. Start MongoDB

For local MongoDB:

```bash
mongod
```

Default local connection used by the backend:

```txt
mongodb://localhost:27017/neosis
```

## 3. Configure backend environment

From `neosis-backend`, set these variables:

```bash
export MONGO_URI="mongodb://localhost:27017/neosis"
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export FRONTEND_URL="http://localhost:5173"
```

On Windows PowerShell:

```powershell
$env:MONGO_URI="mongodb://localhost:27017/neosis"
$env:GOOGLE_CLIENT_ID="your-google-client-id"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"
$env:FRONTEND_URL="http://localhost:5173"
```

## 4. Run backend

```bash
cd neosis-backend
mvn spring-boot:run
```

Backend default URL:

```txt
http://localhost:8080
```

## 5. Configure frontend environment

Create `neosis-frontend/.env.local`:

```env
VITE_BACKEND_URL=http://localhost:8080
```

## 6. Run frontend

```bash
cd neosis-frontend
npm install
npm run dev
```

Frontend default URL:

```txt
http://localhost:5173
```

## 7. Google OAuth2 local redirect URI

In Google Cloud Console, configure this authorized redirect URI:

```txt
http://localhost:8080/login/oauth2/code/google
```

Also configure JavaScript origin:

```txt
http://localhost:5173
```

## Local development checklist

- Backend running on `8080`.
- Frontend running on `5173`.
- `FRONTEND_URL=http://localhost:5173`.
- `VITE_BACKEND_URL=http://localhost:8080`.
- Google OAuth redirect URI points to backend.
- MongoDB connection works.
- Browser allows third-party/cross-site cookies if testing deployed frontend against deployed backend.
