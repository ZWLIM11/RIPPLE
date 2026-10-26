# Local pass review pilot

Start from the RIPPLE repository:

```powershell
python tools/pass-review/serve.py --clip "C:/Users/LIM ZIWEI/Downloads/118577.mp4"
```

Open http://127.0.0.1:8798/. The server binds only to loopback and serves three tool assets, configuration, and this hash-verified clip. No upload, AI API, external scripts, or analytics are used. Video seeking uses HTTP byte ranges. Stop the server with Ctrl+C.

The twelve 20-second windows cover the entire four-minute clip. These are not detected passes. Pause before release, adjust frame timing, capture and download the original-resolution PNG. Review the outcome using playback, then record the passer, intended receiver, outcome, uncertainty and reviewer identity. Capture timestamps are browser seek timestamps, not independently confirmed release frames. Unclear/non-pass cases should remain in the review audit.

Records autosave in browser localStorage; PNGs are downloaded separately. Export JSON regularly and keep PNG files alongside it. Import merges new IDs and does not overwrite existing reviews. Re-capturing the same timestamp updates its record. The same reviewer should use the same browser profile; for independent reviews use separate profiles/export files and adjudicate disagreements explicitly.

## Benchmark boundary

This tool exports `ripple-pass-review-draft`, not the scored benchmark schema. It never sets independent-review, blinded-marking or camera-calibration approvals. Do not pass these drafts directly to benchmark_screenshots.py.

A separate marker must receive only pre-release frames without outcome labels or outcome video. Their markings need the production projection's corners/region/players fields, checked pitch dimensions and all visible defenders, without guessing offscreen positions. Another reviewer verifies target/outcome and release timing. Document reviewer separation and uncertain/excluded cases, then manually assemble a validated manifest following ml/SCREENSHOT-BENCHMARK.md. The benchmark requires image SHA-256, real-image provenance and these review checks.

118577 is panoramic: prior planar mapping error was about 9.7m. Use this clip to test the review workflow and outcome identification; it is not approved for screenshot scoring without a validated distortion/mapping solution. Do not transfer timestamps from the other downloaded match or from full-match annotations without an established synchronization offset.

No pass labels are prefilled. Twelve windows do not count as twelve passes, and one clip does not establish generalization.
