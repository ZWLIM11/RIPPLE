# Experimental match outlook

Status: accepted for illustrative MVP

The user approved adding the supplied match probability spec. Match outcomes may be shown only as an explicitly experimental Poisson baseline using user-entered rates. Action impact uses explicit user-assumed branch probabilities and is labelled illustrative. Shot opportunity is a heuristic, not xG. Existing pass scores stay unchanged and research-only ML models remain undeployed, consistent with ADR-0001 and ADR-0002.

The outcome engine is pure and isolated from the board model. Match context is a separate session-only UI state. No screenshot/full-roster inference is introduced. See `docs/MATCH-OUTLOOK.md` for branch formulas and known omissions.
