SevenStar Backend
=================

Simple Node/Express backend for development and testing.

Quick start

1. cd backend
2. npm install
3. npm run dev   # requires nodemon

Server runs on port 3000 by default. API root: `http://localhost:3000/api`.

Notes for React Native:
- On Android emulator use base URL `http://10.0.2.2:3000/api` (already configured in app).
- On a real device replace baseURL in `src/services/api.ts` with your machine IP.
