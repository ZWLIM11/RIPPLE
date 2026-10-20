# Cloudflare deployment

## Recommended: Workers with Static Assets

This branch packages the browser application and a Worker API together. It does
not run the Node development server in Cloudflare. The build extracts the same
pure model sources into ESM; parity tests compare Node and Worker results.
No Azure configuration is required for board, replay, manual import or local explanations.

From the repository root:

```sh
npm ci
npm test
npm run check:cloudflare
npm run preview:cloudflare
```

Preview: http://127.0.0.1:8787. In another PowerShell terminal:

```powershell
$env:PASS_DETECTIVE_URL='http://127.0.0.1:8787'
npm run smoke
```

`check:cloudflare` is a deployment dry run; it does not publish.

### Deploy later through Cloudflare's Git integration

Create a **Worker** connected to `ZWLIM11/RIPPLE`.

| Setting | Value |
|---|---|
| Root directory | Repository root |
| Deployment branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Node version | 24.21.0 (or supported Node 24.15+) |
| Worker name | `ripple`, matching `wrangler.jsonc` |

The deployment command also invokes the configured build hook; running build twice
is harmless. Dependency installation must run `npm ci` (Cloudflare normally installs
dependencies for connected builds). No Python installation or model training is needed.
If the account needs a different Worker name, change it in both Cloudflare and Wrangler.

Select `main` as the production branch in
Cloudflare. The repository transfer itself does not deploy the app.

CLI alternative, when you are ready to publish:

```sh
npx wrangler login
npm run deploy
```

Cloudflare credentials belong to your Cloudflare account/deployment environment;
they are not app settings. Do not commit API tokens.

## Azure is off by default

`ENABLE_AI` is `"false"` in `wrangler.jsonc`. Even if credentials exist, the Worker
does not call Azure until explicitly enabled and a rate-limit binding is present.

Later, configure resource URL and deployment names using Worker variables/secrets:

- `FOUNDRY_CHAT_URL`
- `FOUNDRY_DEPLOYMENT`
- `FOUNDRY_VISION_DEPLOYMENT`
- `FOUNDRY_API_KEY` — always a Cloudflare **secret**

Then change `ENABLE_AI` to `"true"` in the Wrangler configuration and redeploy.
For local Wrangler testing use an ignored `.dev.vars` file. Do not put secrets in
`vars`, browser JS or a build-time replacement. `.env` is also ignored.

The current binding permits 10 API requests per minute per IP. Cloudflare rate
limits are approximate/location-local; this is not a hard global billing cap.
Same-origin checks are not authentication. Before enabling paid AI on a public
demo, set an appropriate abuse policy (for example Cloudflare Access for a private
preview or Turnstile plus quotas for a public demo) and provider budget monitoring.
Live Azure and public production load are not verified in this branch.

## Cloudflare Pages alternative (static-only)

If you specifically prefer **Pages**, use:

- Build command: `npm run build`
- Output directory: `dist/cloudflare/public`

This hosts the board and local features only. It does **not** deploy the Worker
API. Azure calls will fall back/unavailable. Use Workers for the complete API path.
Never select the repository root as the public asset directory.

## Packaging and security

- Explicit allowlist: ten app assets plus `_headers`.
- No `.env`, raw StatsBomb data, trained weights, research reports or source server.
- Script CSP hashes are generated from the two existing inline scripts.
- Frame embedding is denied; camera/microphone/geolocation permissions are disabled.
- API responses are not cached. Input types, origin, methods and body sizes are checked.
- The frontend renders verified evidence text, not arbitrary model HTML.
- No database/persistent uploads: board state resets on reload; JSON export saves it.
- CI checks app tests, build dry run and a local Worker smoke test; it does not deploy.

## Release checklist

1. Review the transferred release and training result; CatBoost is not integrated.
2. Confirm CI passes on the GitHub commit.
3. Deploy a preview and test board, replay, JSON import/export and mobile layout.
4. Keep Azure off until credentials, live tests and abuse controls are ready.
5. Select main for production when you decide to deploy.

References:
[Static Assets](https://developers.cloudflare.com/workers/static-assets/),
[bindings](https://developers.cloudflare.com/workers/static-assets/binding/),
[secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
