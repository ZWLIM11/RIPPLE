# Real screenshot evaluation
Status: claimed
Type: research

Find independently labelled footage, freeze model, run screenshot geometry through production code, report coverage and outcome metrics. Do not claim real screenshot validation from synthetic fixtures or provider tracking coordinates.

## Progress

Supplied 118577 clip checksum verified and six actual frames decoded/inspected. Full-pitch four-corner mapping cannot rectify its visibly curved touchline. Reproducible pilot report in `ml/screenshot-pilot-118577.json`; no outcomes scored. Need validated camera rectification plus matching annotations and independent review. Four software tests pass. Outcome benchmark remains pending, not resolved.

Runner and four software verification tests completed. Frozen model hashes enforced; projection uses production JS. Real screenshot benchmark remains pending: no accessible independently labelled clips. SoccerTrack v2 access requires user acceptance; requested asynchronously. Public figures were inspected and excluded as unsuitable. Report explicitly records zero scored attempts and no metrics. See `ml/SCREENSHOT-BENCHMARK.md`. Do not mark this ticket resolved until real footage evaluation is complete.
