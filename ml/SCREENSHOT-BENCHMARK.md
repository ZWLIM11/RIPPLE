# Real screenshot benchmark: awaiting footage

2026-10-21. **No real pass outcomes have been scored. No screenshot accuracy or readiness claim is supported.** The empty evaluation report deliberately has no metrics. The SkillCorner visible model remains research-only.

## Access findings

- [SoccerTrack v2](https://huggingface.co/datasets/atomscott/soccertrack-v2) provides synchronized real videos, game-state annotations and action events, but access requires logging in and accepting its information-sharing conditions. Access has not been granted in this session. Its event classes do not by themselves establish intended targets and outcomes for failed attempts; those need independent clip review.
- [SoccerNet](https://www.soccer-net.org/data) provides relevant visual datasets; protected video access requires an account and agreement. Public documentation figures are not outcome-labelled benchmark samples.
- [SoccerTrack's public camera example](https://github.com/keisuke198619/SoccerTrack/blob/main/notebooks/detect_and_track/imgs/cam_area.png) was visually inspected. It is a composite with tinted camera overlays and no pass timing, intended-target or outcome labels. It is excluded, not counted as a real prediction test. SoccerNet's public calibration illustration is a pitch diagram and its thumbnail is a presentation image; both are excluded.

The user has been asked to arrange dataset access or supply usable match clips. Do not paste credentials into chat. Uploaded screenshots alone cannot establish the eventual pass outcome.

## Implemented runner

`benchmark_screenshots.py` verifies source image hashes, annotation provenance, separate marker/outcome reviewer, release timing declarations, outcome labels and previous-match exclusion. It refuses changed model artifacts. `project_screenshot.mjs` executes the production `SnapshotModel` and `FrameModel` code on normalized landmark/player clicks. It does not use tracking coordinates or detect players itself. Features are computed with the frozen model's geometry function; both CatBoost and logistic predictions use their saved calibrators.

Every sampled attempt must be recorded, including abstentions. Report coverage, rejection reasons, per-match metrics, calibration and discrimination. The screening rule is in `.scratch/screenshot-benchmark/spec.md`; production approval always stays false pending independent review. Provenance declarations must be audited by a person: the runner cannot prove annotations are honest, images are football, or a differently named match was not in training.

Four software tests passed: no-data handling, provenance/outcome requirements, actual production projection plus degenerate-corner rejection, and image-hash verification. **These fixtures are synthetic unit tests, not a screenshot benchmark.** No browser interaction or detector benchmark has been completed.

## Annotation procedure

1. Select contiguous time windows from at least five new matches before looking at outcomes. Record every attempted pass, not highlights alone. Review permission to use the footage.
2. Extract the last frame before/at release; retain the original image and a clip extending through reception/interception/out-of-play. Record source and release frame/time.
3. A marker views only the release image, marks supported pitch landmarks and every visible player's ground-contact point, and identifies the passer. Record unsupported camera geometry, cropped targets or indistinguishable teams as abstentions.
4. A separate reviewer uses the clip to identify the intended target and outcome. Ambiguous target stays unknown. Match the target to the marker's existing player ID without changing positions after seeing the outcome. Preserve the annotation history.
5. Use the app's fixed 105x68 convention only for genuinely compatible footage. Current four-corner planar mapping does not correct fisheye distortion. Panoramic sources need verified rectification first; do not silently treat curved lines as planar geometry.
6. Freeze annotations, then run evaluation. Seek at least 500 eligible attempts, including 100 failures, across five matches. Report the failed attempts excluded by visibility/ambiguity. Do not retrain on this benchmark.

## Input format

Store private images and manifest under ignored `work/screenshot-benchmark/`. Each `attempts` entry needs:

```json
{
  "id": "dataset-match-period-frame",
  "source_dataset": "provider-name",
  "match_id": "new-match-id",
  "source_url": "original source URL",
  "clip_reference": "local clip name and release time/frame",
  "image": "release.png",
  "image_sha256": "SHA-256 of original release.png",
  "real_image": true,
  "marker": "reviewer-A",
  "outcome_reviewer": "reviewer-B",
  "marked_before_outcome_review": true,
  "release_frame_verified": true,
  "all_visible_defenders_marked": true,
  "outcome": "successful",
  "pitch_length": 105,
  "pitch_width": 68,
  "region": "full",
  "corners": [],
  "players": [],
  "passer": "player-id",
  "target": "player-id"
}
```

This is an incomplete schema example, not a scored case. `corners` contains four normalized `{x,y}` points in the app's perimeter order. `players` contains `{id,team,x,y}` with normalized image feet clicks and `team` home/away. Supported regions: full, leftHalf, rightHalf, leftBox, rightBox. `outcome` is successful, unsuccessful, or offside. An unscorable sampled attempt can instead record `{id, abstention: reason}` plus its source provenance. Do not fabricate missing points.

```text
python ml/benchmark_screenshots.py work/screenshot-benchmark/manifest.json --output work/screenshot-benchmark/results.json
python ml/test_screenshot_benchmark.py
```

Requires Node and the existing Python ML environment, plus the original local `visible.cbm` / `visible.joblib` artifacts. They are intentionally not committed. Public reports should contain aggregates; keep individual screenshots, reviewer identities and per-attempt predictions local unless sharing is authorized.
