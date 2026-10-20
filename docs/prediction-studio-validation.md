# Prediction studio validation — 2026-10-20

## Completed

- Node 24.21: 24 automated tests passed (model, snapshots, replay, intelligence, mocked provider, integrated DOM interactions).
- Local HTTP smoke passed: static assets, API fallback, bad origin, invalid payload, disallowed methods and private file isolation.
- Real in-app browser: synthetic match loads; reveal changes observed statistics; local explanations show evidence buttons; defender sensitivity reports tested range; broadcast view shows timed estimate and evidence ID. No browser console errors were captured during these checks.
- Narrow browser layout inspected visually; controls wrap and the pitch stays inside its panel. Broadcast secondary text contrast adjusted after inspection.

## Still unverified

- Live Azure tool calls and vision output: no configured deployment credentials.
- Screenshot inference on real football imagery and independent football-expert judgments.
- Predictive accuracy on held-out real tracking/event data. Synthetic outcomes are not accuracy evidence.
- Production hosting, public repository permissions, submission video and final official eligibility/compliance review.

## Reviewer scenarios

1. Compare the same pinned candidate before/after moving its challenging defender into the lane. Check timing and rejection reasons.
2. Move the receiver offside in each attack direction. Check that an offside snapshot is rejected.
3. Compare preferred and weaker foot on the same route, then rotate the passer. Assess preparation assumptions with football expertise.
4. Reveal a shot sequence and inspect earlier contribution IDs. Seek backwards and confirm later outcomes disappear.
5. Configure Azure, request an explanation, inspect actual tool activity, then disable the service and confirm local fallback is clearly labeled.
6. Calibrate a permitted full-pitch image, review suggested markers, correct errors, apply and explicitly set possession. Compare projected locations to independently annotated ground truth.

These checks validate software behavior, not calibrated completion probabilities.
