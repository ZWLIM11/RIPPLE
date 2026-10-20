# Next UX improvements

Implemented: guided example, section links, contextual help for the main workflows,
role glossary, saving reminder, pitch-first order, larger controls and mobile layout.

Recommended next, in priority order:

1. **Undo / redo and autosaved drafts.** Protect board edits from mistakes and reloads.
   Include an explicit clear-draft control and versioned local storage.
2. **Accessible screenshot mapping.** Add zoom, keyboard position entry, and a
   visible 23-marker checklist. Do not invent positions for off-screen players.
3. **Full English / Bahasa Melayu interface.** Centralize all labels and errors,
   including the new help, instead of translating only explanation content.
4. **Guided screenshot sample.** Ship a rights-cleared full-pitch example with known
   coordinates so users can learn corner calibration and marker placement.
5. **Shareable analysis report.** Export a readable pitch image plus route evidence
   and model assumptions, alongside the existing technical JSON exports.
6. **User testing on phones.** Observe first-time users completing a pass comparison
   and screenshot import; check touch targets, long tables and pitch readability.
7. **Validated predictions.** Continue spatial-data research with a fresh holdout.
   Only show completion probabilities after calibration and evaluation justify them.
8. **Optional AI setup and cost controls.** Add configured-service status and useful
   failure recovery; maintain explicit image submission and reviewed suggestions.

## Verification limits

Automated checks cover replay exit, guided example startup, section links and
existing analysis workflows. Browser control was disabled during this update;
responsive styles still need visual verification on real desktop and mobile screens.
