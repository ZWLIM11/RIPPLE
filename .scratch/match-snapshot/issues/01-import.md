# Import match snapshot
Type: task
Status: resolved

Add local screenshot calibration and full-board mapping, validated JSON persistence,
and pure geometry/validation tests. Work only on v1zw.

## Comments

- Added manual full-pitch screenshot mapping and JSON board persistence.
- Ten tests pass; screenshot UI JavaScript passes syntax checking.
- Visual interaction testing remains unavailable because browser automation is disabled.
- Automatic detection and cropped-broadcast calibration remain outside this implementation.
