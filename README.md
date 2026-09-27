# AVSK Portal Backend

This project includes a lightweight production-ready backend for the AVSK Portal.

## Features
- Express REST API with JWT auth and RBAC
- SQLite database by default (easy for local dev)
- KYC/profile management with uploads
- Admin wallet operations and transaction ledger
- Referral lead capture API with redirect flow
- Admin product CRUD and product publishing
- Docker support and seed script for admin creation

## Quick start

1. Install dependencies:
   npm install
2. Copy environment file:
   cp .env.example .env
3. Start dev server:
   npm run dev
4. Open the frontend in a browser or use the static files from repo root.

The app serves the static HTML files from the project root and exposes the API under `/api`.

## Default admin seed
The seed script creates an admin account using the environment variables `ADMIN_EMAIL` and `ADMIN_PASSWORD` if they are set. If not set, it uses:
- admin@avsk.com / Admin@12345

Run:
npm run seed

## API overview

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Products
- GET /api/products
- POST /api/products (admin)
- PUT /api/products/:id (admin)
- DELETE /api/products/:id (admin)

### Users
- GET /api/users (admin)
- PATCH /api/users/:email/wallet (admin)
- GET /api/users/:email (admin)

### Referrals
- POST /api/referrals/submit

### Transactions
- GET /api/transactions
- GET /api/transactions/:email

### KYC upload
- POST /api/upload/kyc

## Security notes
This backend is designed for a real app but the current static HTML files are still browser-based and should eventually be migrated to fetch from the backend instead of using localStorage for authentication. For real-money deployments, move to a secure server-side deployment and use a managed database and secure object storage for KYC files.
