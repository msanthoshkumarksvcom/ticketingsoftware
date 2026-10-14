# QA Software

QA Software is split into a React frontend and an Express API:

```text
ticket-frontend/
  src/
    components/       Shared UI such as the admin sidebar
    pages/            Login, dashboard, and workspace pages
    styles/           Shared application styles
ticket-backend/
  server.js           Express API routes and server startup
  db.js               PostgreSQL connection pool
  seed.js             Admin account setup
  .env                Local database URL and JWT secret (not committed)
```

## Run locally

1. Configure `ticket-backend/.env` with `DATABASE_URL` and `JWT_SECRET`.
2. Start the API in one terminal:

   ```powershell
   cd ticket-backend
   npm install
   npm start
   ```

3. Start the frontend in another terminal:

   ```powershell
   cd ticket-frontend
   npm install
   npm run dev
   ```

The frontend expects the API at `http://localhost:5000`.

## Checks

Run `npm run lint` and `npm run build` from `ticket-frontend`.
