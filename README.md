# RIPPLE — Pass Detective

Football passing analysis and synthetic match replay, prepared for Cloudflare Workers.

This repository contains the reviewed PassDetective release from
[SooZZ-05/PassDetective](https://github.com/SooZZ-05/PassDetective), source commit
`418ef0f07004da1d9ef5a534a4499377d3bb6660`, transferred at the repository owner's request.
The app retains its Pass Detective interface name and existing contributor attribution.
This transfer does not grant a new software or data licence.

## Run locally

Use Node 24.15+:

```sh
npm ci
npm start
```

Open http://localhost:3001. For the Cloudflare runtime:

```sh
npm run preview:cloudflare
```

Open http://127.0.0.1:8787.

## Deploy to Cloudflare

Connect **ZWLIM11/RIPPLE**, branch **main**, as a Worker project.
Build command: `npm run build`. Deploy command: `npm run deploy`.
Worker name: `ripple`. Azure is disabled by default.

See [full deployment instructions](docs/CLOUDFLARE.md),
[features and limits](prototypes/pass-detective/README.md), and
[source release review](docs/branch-review.md).

## Model research

CatBoost was trained locally and evaluated on StatsBomb data, but did not pass
its promotion threshold. The application still uses the physical/heuristic engine.
See [evaluation and reproduction instructions](ml/README.md).
Raw data, model weights, API keys and local environment files are not included.
