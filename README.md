# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Team Invitation Email API

This project now includes a backend endpoint to send invitation emails when organizers invite team members.

### Security posture

The mail API now applies:

- strict origin allowlisting via `MAIL_API_ALLOWED_ORIGIN`
- `helmet` security headers
- request body limits
- per-endpoint rate limiting
- schema validation for invite payloads
- HTML escaping for email content

For production, place the API behind a CDN or WAF such as Cloudflare WAF or Azure WAF and keep MongoDB private on the network.

### 1) Configure environment

Copy `.env.mail.example` to `.env`.

Recommended (Resend):

- `MAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `RESEND_FROM` (must be a verified sender in Resend)

Optional (SMTP fallback):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Common:

- `MAIL_API_ALLOWED_ORIGIN` should list exact allowed origins, separated by commas
- `VITE_INVITE_EMAIL_API_URL` (default: `http://localhost:8787/api/invitations/email`)

### 2) Start frontend

Run:

`npm run dev`

### 3) Start mail API

Run in another terminal:

`npm run mail-api`

Health check:

`GET http://localhost:8787/api/health`

The health response includes selected provider (`smtp` or `resend`) and configuration issues.

If SMTP is not configured or the API is unavailable, the app falls back to manual sending via `Open Email` from the invitation row.

## Authentication Provider

This app uses Firebase for authentication and primary data storage.

- `VITE_AUTH_PROVIDER=firebase`

When using Firebase, set these env keys:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Roles and profile records are stored in Firestore (`users` collection). Add admin emails to `VITE_ADMIN_EMAILS` as a comma-separated list.

## Security Checklist

Before production deployment:

- enforce strict Firestore Security Rules (especially admin-only writes)
- set `MAIL_API_ALLOWED_ORIGIN` to your exact production origin
- verify `RESEND_FROM` or `SMTP_FROM` is a real verified sender
- add a WAF or reverse proxy in front of the API
- keep the database private and expose only the backend service
