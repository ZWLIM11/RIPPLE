# Visual decision flip
Status: resolved
Type: task

Preview original and hypothetical defender positions and leading routes without mutating the board. Apply deliberately, support board-history undo, invalidate stale previews on edits/replay. Test phone layout and deploy.

## Answer
Implemented isolated responsive SVG showing original/new routes and hypothetical defender arrow. Apply creates one board-history step; Undo restores it without losing a preceding edit. Board/replay changes invalidate previews. 68 tests pass, Cloudflare dry run passes; phone-width browser verified preview/apply/undo and no page overflow.
