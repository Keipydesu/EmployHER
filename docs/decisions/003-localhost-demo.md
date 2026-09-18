# 003. Localhost demo for current implementation

- Status: Accepted user direction.
- Date: 2026-09-18
- Supersedes: [decision 002](002-hackhers-career-navigator.md)'s Vercel hosting choice only.

## Decision

Run the app on localhost for development and the MVP demo. Defer hosted deployment and hosting-provider selection. The remaining stack and product scope stay as defined in the current docs.

## Consequences

Platform owner C owns local setup, authentication configuration, shared infrastructure, CI, and local build/browser verification. MVP acceptance requires a working localhost demo. External service integrations remain planned; localhost does not mean offline operation. A minimal Next.js scaffold runs directly on Node 24. Docker is deferred as unnecessary for the current MVP; see [development](../development.md) for verification and remaining work.
