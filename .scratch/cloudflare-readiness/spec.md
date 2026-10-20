# Cloudflare readiness

Review maintained application, research code and tests on v1zw. Keep main unchanged.
Target Cloudflare Workers with Static Assets, using the same pure model sources.
Build generated ESM at build time, avoiding filesystem/vm in deployed runtime.
Ship an explicit asset allowlist; no raw data, weights, .env or research artifacts.
Cloud AI stays disabled by default; opt-in requires rate-limit binding and secrets.
Validate actual workerd preview, security/input tests and existing model/UI tests.
Do not deploy publicly during preparation. Record residual limitations honestly.
