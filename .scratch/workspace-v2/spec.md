# RIPPLE workspace v2

Replace the long single-page stack with distinct analysis, replay, screenshot,
insight and reporting views. Retain the existing tactical engine.

## Deliverables

- Persistent desktop rail, mobile navigation, compact introduction, focused editing.
- Undo/redo and versioned local draft persistence with validated restoration.
- Replay must not overwrite the editing draft; unavailable storage has a fallback.
- Screenshot zoom, scroll, 23-marker checklist, percentage coordinate entry and
  original practice illustration. Existing corner and player validation remains.
- Central display translation for English and Bahasa Melayu without changing
  model identifiers or exported JSON schema.
- Standalone HTML analysis report and SVG pitch export; HTML is printable to PDF.
- Model evaluation visible with explicit failed gate and research-only status.

## Model scope

Rechecked the existing local model artifacts and evaluation. It still fails the
2% improvement gate and lacks alternative-receiver features. No percentage
completion predictions are exposed. A new intended-target spatial dataset and
fresh evaluation are required before that feature can be delivered.

## Verification

Automated UI tests cover history, reload, replay isolation, translation, report
contents and screenshot keyboard mapping. Local Cloudflare runtime HTTP checks
cover assets and API behavior. Browser control remains disabled in Work settings;
real desktop/mobile visual and user testing cannot be signed off in this session.
