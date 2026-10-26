# Score-aware tactical guidance
Status: resolved
Type: task

Add opt-in contextual guidance (off, follow score, protect, win, equalise). Explain score/time from analysed-team perspective, flag conflicting manual intention, handle full time, preserve user overrides in save/load/export and migrate old files to off. No probability/ranking changes or automatic overrides of physical feasibility.

Implemented with pure score/time guidance and persisted manual intentions. Verified 66 passing app tests, Cloudflare dry run, and 390px phone viewport without page overflow. Guidance does not change model outputs.
