# v1zw review — 20 October 2026

## Scope

Reviewed maintained application source: inline passing model and board UI,
comparison, snapshots, replay, intelligence, studio UI, vision adapter, AI service,
Node loader/server; local ML extraction/training/downloader/evaluation; tests,
package scripts and deployment boundaries. Third-party dependency source was not
manually audited; npm advisory scan reported zero vulnerabilities at review time.
This is a scoped engineering review, not proof that all possible defects are absent.

## Findings addressed

| Finding | Change |
|---|---|
| Node filesystem/vm runtime is incompatible with a plain Worker | Build-time ESM extraction, Worker entry and model parity tests |
| Whole repository could expose data/secrets if used as asset root | Explicit public asset allowlist and private-path smoke tests |
| Paid provider calls need a separate cloud enablement boundary | Azure disabled by default; rate-limit binding required before enabling |
| Weak API payload bounds and null handling | Worker byte limits, method/origin/content-type checks, object validation; Node payload/null checks tightened |
| Replay Next/Previous remained enabled after exit | Both disabled on exit; regression assertion |
| Older async JSON load could overwrite newer state | Import version guard and race regression test |
| Language change left broadcast label/document language stale | Update both; DOM language assertion |
| Old animation status could persist after board changes | Clear status when preview stops |

## Verification

- 31 JavaScript tests passed, including Worker API and Node/Worker parity.
- Six Python ML checks passed, including saved-model prediction reproduction.
- Wrangler 4.151.2 deployment dry run succeeded (about 30 KiB Worker before gzip).
- Actual local workerd preview HTTP smoke passed: assets, status, explanation
  fallback, invalid payload, wrong origin/method, private paths.
- Browser on workerd: replay load/reveal and explanation fallback worked with no
  captured console errors at that point.
- `npm audit --audit-level=moderate`: zero reported vulnerabilities.
- No public deployment, Cloudflare account changes or main merge performed.

## Remaining limits

- CatBoost failed the predeclared promotion gate; no trained probability in the app.
- Synthetic sequence is illustrative and physical heuristics lack independent
  football accuracy validation.
- Screenshot mapping requires full pitch, all players and manual identity review.
- Live Azure explanation and vision deployments remain untested.
- UI is partially bilingual; canvas mapping is not fully keyboard accessible.
- Existing classic scripts share state and use wrapper functions; regression tests
  cover key transitions, but a modular UI refactor would improve maintainability.
- Cloud rate limits are approximate, not authentication or a global cost ceiling.
- Cloudflare account quotas, domains, production load and live deployment remain
  to be checked after a preview is deployed.

Deployment instructions: [CLOUDFLARE.md](CLOUDFLARE.md).
Training evidence: [ML report](../ml/README.md).
