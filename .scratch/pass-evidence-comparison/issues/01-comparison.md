# Pin and compare candidate pass evidence
Type: task
Status: resolved

Implement pin, clear, compare and JSON export controls below selected route evidence.
Preserve the original browser-only file workflow. Comparison fixes the target location;
moving the receiver does not silently move that target. Explain this in the UI.

## Comments

- Implementation underway on `codex/pass-evidence-comparison`.
- Implemented pin, clear, fixed-candidate comparison and JSON export in `comparison.js`.
- Five automated model checks and JavaScript syntax check pass. Visual interaction
  verification remains unavailable because local browser automation is disabled.
