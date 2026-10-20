# Pass Detective design discussion

Status: Design interview in progress; not an implementation specification.

## Current product direction

The user's latest clarification supersedes the automatic match-stream experience as the primary product. Build an interactive tactical board: the user places 22 players from two teams, selects the ball location, and the model evaluates which passing lanes are most optimal.

- Core deliverable: a passing recommendation model and tactical-board frontend.
- Keep all-eligible-teammate evaluation, top-three route presentation, and targets at feet or reachable space ahead.
- Keep ground passes, left/right-foot comparison, safest and attacking objectives, uncertainty-aware similar options, and no clear passing option when appropriate.
- A three-minute condensed demo with playback controls was accepted before this clarification; retain only as a possible later demonstration, not a dependency of the interactive board.
- Cloud spending is not a prerequisite for local model and board development. No cloud budget has been approved.
- Azure hosting, automatic narratives, match streams, personalization, and recaps were accepted for competition coverage earlier; they are now deferred integration scope, pending confirmation of how the board will be submitted against the challenge.
- Clarify how ball placement determines the passer and how user-specified movement or stationary defaults affect recommendations.

## Tactical board decisions and prototype

- Ball placement within 2 metres of a player selects that passer; explicit selection can override ownership. An unowned ball produces no recommendations.
- Players start stationary, with configurable reaction time, acceleration, and maximum running speed. Movement arrows are deferred.
- The user authorized the local tactical-board prototype and passing recommendation model.
- Prototype: prototypes/pass-detective/index.html, with a pure calculation module and a local in-memory board in one self-contained file.
- Guided scenarios cover an open receiver, blocked lane, pressured passer, and offside position.
- Model explanation, interaction spot checks, limitations, and the pending model-review verdict are recorded in prototypes/pass-detective/README.md.
- This prototype does not validate football accuracy or complete the earlier competition integration scope.

## Earlier agreed competition scope (subject to the clarification above)

- Audience: football fans, with casual and analyst experiences.
- Core task: recommend available passes, rather than predict which pass the player will choose.
- Identify the passer and tactical role from synthetic data; keep tactical role separate from shirt number.
- Compare candidate receivers, target locations, ball speeds, and passing feet.
- Start with explicit movement and interception calculations; AI explains verified evidence.
- Stream a synthetic match containing passes, pressure, turnovers, and shots.
- Connect passing decisions to developing match stories.
- Show automatic live insight cards with clickable evidence and pitch replays.
- Personalize detail for casual and analyst audiences and support English and Malay.
- Generate a personalized final match recap.
- Deliver a working Azure deployment.
- Keep estimated alternatives distinct from observed outcomes; avoid future-event leakage into recommendations.
- Track implementation work in local Markdown under `.scratch/pass-detective/`, with individual tickets under `issues/` after the specification is ready.
- Use fictional teams in an 11-v-11 synthetic match, with a short demonstration replay and inspectable moments.
- Evaluate ground passes to feet and into space, comparing left- and right-foot execution. Lofted passes are deferred.
- Present safest and attacking options, allowing no clear passing option when the evidence warrants it.
- Use the default ticket triage labels: needs-triage, needs-info, ready-for-agent, ready-for-human, and wontfix.
- Generate repeatable synthetic matches from controlled football scenarios with randomized variations, rather than attempt a comprehensive football simulator.
- Initial scenario coverage includes an open receiver, blocked lane, moving receiver, and pressured passer.
- Present estimated interception margins, heuristic difficulty ratings, and relative rankings; completion probabilities require later calibration.
- Evaluate using separate scenarios and varied simulated outcomes, including attractive-looking passes that should be rejected.
- Evaluation must cover interception along the route, receiver control, offside, and pressure during pass preparation.
- Match playback runs automatically. Why this pass pauses the viewer's local replay for inspection; returning to live jumps to the latest event.
- Casual mode shows one recommended route and a short explanation. Analyst mode exposes alternatives, interception margins, difficulty, and supporting events. Both support English and Malay.
- Automatic insight cards focus on escaping pressure, breaking a defensive line, and repeated passing patterns, with a cooldown and supporting event references.
- Explain foot choice when it materially changes a recommendation.
- Calculations and graphics appear immediately; AI narration is asynchronous. Invalid, failed, or late narration falls back to a factual template. Stale narration must not overwrite the current insight.
- The final recap contains three key passing stories, a featured player, and supporting replay links, personalized by mode and language.
- Recaps summarize observed outcomes and explicitly label discussion of unplayed alternatives.

## Open design branches

- Ball ownership and representation of motion on the manually configured board.
- Offside handling for ground passes.
- Exact scoring rules for safest and attacking recommendations.
- Passing-foot and receiving-foot detail, execution assumptions, and uncertainty.
- Exact scenario variation ranges, scoring rules, and evaluation acceptance criteria.
- Concrete insight timing, latency, and personalization acceptance criteria.
- Competition integration scope; Azure architecture and budget only if deployment proceeds.

## Repository setup

- Setup completed using the user-approved draft and AGENTS.md filename.
- Tracker conventions: docs/agents/issue-tracker.md.
- Default triage labels: docs/agents/triage-labels.md.
- Domain documentation conventions: docs/agents/domain.md.
