# AVSK Portal

Frontend-only AVSK Portal for GitHub Pages, built with HTML, Tailwind CSS (CDN), vanilla JavaScript, and browser `localStorage`.

## GitHub Pages deployment

1. Open **Settings → Pages**: https://github.com/myavsk/avsk-portal/settings/pages
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**, then click **Save**.
4. Visit the published URL shown by GitHub. The root page redirects visitors to `auth.html`.

No Node.js, npm, build step, plugin, or server is required for this frontend-only version.

## Pages included

- `index.html` — redirects to secure login/register.
- `auth.html` — partner registration and login.
- `dashboard.html` — isolated partner dashboard, referrals, profile, and KYC fields.
- `admin.html` — admin product, wallet, and KYC controls.
- `referral.html` — anonymous customer lead capture and target redirect.

## Important security limitation

This is a static browser application. `localStorage` data, client-side roles, wallet values, and KYC fields can be changed by anyone using browser developer tools. It must not be used for real-money transactions, production KYC, or legally binding authorization. A real-money service requires a server-side API, database, secure authentication, encrypted document storage, audit logs, and compliance controls.

For demo/testing only, use separate browser profiles when testing separate accounts because `localStorage` is isolated per browser origin, not stored in the repository.
