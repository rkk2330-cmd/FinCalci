# Error Tracking Setup

## What you have now (works immediately, zero setup)

Source maps are generated during every CI build and stored as **private GitHub Actions artifacts** (90-day retention). No external service needed.

### How to decode a production crash:

1. User reports: `TypeError at app-xxx.js:1:48293`
2. Go to GitHub → Actions → latest successful build
3. Download the `sourcemaps-xxxxx` artifact (zip file)
4. Unzip it
5. Run:
   ```bash
   npx source-map-resolve sourcemaps/app-xxx.js.map 1 48293
   ```
6. See the original file and line: `EMICalc.tsx:87:15`

This is enough until you have 1000+ users.

## When to add Sentry (later, when you have real users)

Sentry auto-captures every crash without users reporting anything. Set it up when:
- You have 1000+ monthly active users
- Crashes are happening that nobody reports
- You want email/Slack alerts for every production error

When ready, go to **sentry.io/signup**, create a project, get an auth token, and uncomment the Sentry block in `.github/workflows/ci.yml`. Sentry's own onboarding wizard will guide you through the current UI (which changes frequently).

The CI file is pre-wired — you just uncomment 8 lines and add your token as a GitHub secret.
