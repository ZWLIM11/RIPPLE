# Frozen screenshot robustness audit
Status: resolved
Type: research

Use existing SkillCorner visible model and original four test matches, without tuning. Test removal of nearest lane defender, random 25% defender omission (five seeds), 5% horizontal scaling and 2m common translation. Compare frozen logistic on identical rows. Track abstentions, probability changes and per-match performance. These are simulated input failures on previously examined data, not independent screenshot validation.

## Answer
See ml/SCREENSHOT-READINESS.md and screenshot-robustness.json. Frozen clean predictions reproduced. Missed lane defender raises mean predicted completion 6.99 pp and ECE to .097. All five random-omission runs exceed .05 ECE. Not ready for screenshot percentages. No deployment or weights changed.
