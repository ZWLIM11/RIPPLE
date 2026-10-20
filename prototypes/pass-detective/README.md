# Pass Detective prediction studio

Maintained on `v1zw`. Estimates ground-pass feasibility, interception timing and receiver control, with fictional match replay and optional Azure Foundry explanations.

## Run

From the repository root, using Node 24.15+ (tested with 24.21):

```sh
npm ci
npm start
```

Open http://localhost:3001. State resets on reload; use board JSON to save a setup. The server binds to loopback for local use. Opening `index.html` directly also supports the board without optional AI. No production hosting or authentication is included.

### Optional Azure Foundry

Copy `.env.example` to `.env` in the repository root. Set `FOUNDRY_CHAT_URL`, `FOUNDRY_DEPLOYMENT` and `FOUNDRY_API_KEY`, then restart. Use a deployment supporting function calling and JSON output. `FOUNDRY_VISION_DEPLOYMENT` optionally enables image suggestions on the same endpoint. Keep `.env` private.

The explanation agent has a four-turn budget. It retrieves verified route, timing and model-limit facts through tools, then selects fact IDs. The server supplies English or Malay text from those facts; arbitrary generated prose is not displayed. Failures fall back to labeled local templates. Evidence and agent activity are visible. Keys remain on the server. Provider behavior is covered by mocks; a live deployment has not been tested in this workspace.

## Features

- **Tactical board:** drag 22 players and the ball; select possession, foot abilities, facing, movement assumptions and possession/progression objective.
- **Passing predictions:** rank up to 180 candidates across ten teammates, two feet, three launch speeds and three targets. Inspect viable and rejected receivers, preparation time, ball travel, control, defender arrival and offside.
- **Candidate comparison:** pin receiver, target, speed and foot; edit the board and inspect before/after evidence. Export both states as JSON.
- **Sensitivity:** move the challenging defender toward the weakest route point in 0.25 m steps up to 5 m with other inputs fixed. Inspect each tested margin.
- **Estimated animation:** decelerating ball travel and illustrative player movement; cancels when the decision changes and respects reduced motion.
- **Synthetic match:** three seeded 18-decision sequences. Choose a candidate, reveal the simulated action, play or seek the timeline. Viewer choice, recommendation and simulated outcome remain separate.
- **Player Focus:** observed events, stats, recap and earlier contributions to shot-ending sequences. Contributions describe involvement, not causal credit.
- **Turning points:** observed progression, pressure changes, turnovers, shots and goals. Future outcomes are excluded until revealed; seeking forward treats earlier decisions as observed.
- **English/Malay:** bilingual explanation facts, recaps and key studio controls. The entire interface is not translated.
- **Broadcast view:** simplified presentation with an eight-second estimate overlay, evidence references and timing JSON export. This is not a video compositor.

Board edits lock during replay. **Edit board / exit replay** releases the current snapshot for what-if exploration.

## Import a screenshot or board

1. Upload PNG, JPEG or WebP (up to 15 MB / 40 megapixels).
2. Mark four pitch corners in perimeter order, starting at the Blue defensive end's upper touchline. Select each team/shirt and mark player feet, plus the ball.
3. Optionally request Azure image suggestions after calibration. The UI discloses that a resized image is sent to the configured provider. Review and accept each suggestion individually; unknown identities still need manual marking.
4. Mark all 22 players and the ball, apply, then select the observed passer and **Make passer**. Review facing, foot ability and movement assumptions.

Manual mapping stays local. Optional AI sends the resized image only when requested. It is not a trained football tracking pipeline; output confidence is not calibrated. Cropped broadcast views with missing corners/players are unsupported. A still image cannot determine velocity or possession reliably. The projective transform models a planar pitch, not lens distortion or occlusion. Undo/restart calibration corrects marks. Applying clears possession and pinned comparisons. Board JSON saves validated positions and assumptions, never the image.

## Model boundary

The original pure `PassingModel` remains the prediction engine. Coordinates use a 105-by-68-metre pitch. It estimates preparation, decelerating ball travel, defender arrival, receiver control, pressure before release and snapshot offside position. Weights, targets and thresholds are heuristic. A score of 71 is **not a 71% completion probability**. No trained predictive model or real-world accuracy claim is included.

Players start stationary in the arrival model. Curved/lofted passes, shielding, teammate obstruction and execution-error trajectories are not modeled. Route sampling approximates interception. Offside is not a full referee decision. Synthetic outcomes are toy simulations, not independent validation. Animation illustrates the estimate; it does not reconstruct real motion.

## Verification

```sh
npm test
# With npm start running:
npm run smoke
```

The 31 JavaScript tests cover the physical model, snapshot validation/calibration, replay reproducibility and future-event exclusion, sensitivity, contributions, overlay timing, provider tool constraints, vision validation, DOM transitions and Cloudflare behavior. HTTP smoke checks cover served assets, local explanation fallback, input validation, origin rejection and private-file isolation. See [branch review](../../docs/branch-review.md) for current results and [Cloudflare deployment](../../docs/CLOUDFLARE.md) for hosting.

## Hackathon submission work still required

The synthetic replay supports event → interpret → explain → render → personalize. Azure integration needs a real deployment and recorded evidence of use. Before submission, recheck the official rules, prepare the required short demo video, public repository and accessible demo, and confirm eligibility and asset rights. This private development branch alone is not a complete submission.
