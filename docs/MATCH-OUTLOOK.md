# Match outlook: experimental scenarios

## Audit and scope

Before this change, RIPPLE had a physical passing model with heuristic rankings and synthetic replay shot events. It had no shooting-score or trained xG calculation. This MVP adds an isolated sixth workspace; it does not deploy the research CatBoost model or change the passing rankings. Screenshot measurements remain separate and do not populate this full-board experiment.

## Calculations

For each side, lambda = assumed goals per 90 × remaining minutes / 90. Independent Poisson counts use p(0)=exp(-lambda), p(k)=p(k-1)lambda/k. Enumerate until omitted mass <=1e-12 for each side, normalize, then sum score comparisons into win/draw/loss. UI percentages use largest-remainder rounding to total 100.0%. At regulation plus entered stoppage time the result is deterministic. No extra time or penalties, time-varying strength, possession adjustment or automatic home advantage. Goal rates already include whatever home advantage the user assumes. Formula reference: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson.html

Shot opportunity is a new heuristic, **not xG**: clamp to [0,100] the quantity 100 × [0.5 exp(-distance/25) + 0.3 min(1, goal-angle/(pi/3)) + 0.2 min(1, nearest-opponent-distance/8) - 0.12 blockers]. A blocker is within 1.5m of the centre-goal segment, between ball/target and goal. Opponents include the goalkeeper; goalkeeper distance is also displayed, but keeper reach/skill is not modelled. Defenders remain at their current positions when assessing a receiving location. These coefficients are design assumptions without calibration.

The three highest-ranked distinct feasible receivers and a hypothetical direct shot are shown. Direct shots are not asserted feasible. Passing score is never converted into pass success. The user explicitly chooses probabilities for completion S, shot creation C, goal conditional on shot G, and counter goal after failure T. All are assumptions; no genuine xG is displayed.

Pass branch weights: SCG (goal), S(1-C) (no shot), SC(1-G) (miss), (1-S)(1-T) (failed pass, no counter goal), (1-S)T (counter goal). Shot branch weights: G, (1-G)(1-T), (1-G)T. Sum the win probability of each post-branch score weighted by its probability; subtract pre-action baseline and report **percentage points**.

The explicit branches replace goal generation over a user-selected action/counter interval. Poisson restarts after that interval, avoiding double counting within it. Pass interval must cover preparation plus flight. No-goal branches use identical future goal rates regardless of possession. Rebounds, counters after a completed pass followed by a miss, and other events within the interval are omitted. This is illustrative impact, not statistically grounded WPA or a best-action recommendation. An interval longer than remaining time is rejected.

## Try it

Run `npm start`, open the printed URL, then choose **06 Match outlook**. Set team/score/minute/rates. The analysed team must match the board passer. Explore an action, edit probabilities, and calculate illustrative impact. Compare different action assumptions in the table. Change the score or a player on the tactics board: stale scenarios are cleared. Reset restores match defaults. Match context is session-only and is not included in existing board JSON exports. The new panel is currently English; existing app translations remain available elsewhere.

## Verification and next steps

`npm test` covers normalization, symmetry, bounds, full time/stoppage, missing probabilities, action branches, turn-over costs, mirror geometry, no mutation, UI invalidation and existing functionality. Browser checks cover the scenario calculation and 390px mobile layout. These are software tests, not prediction validation.

Next research: train and calibrate shot creation and scoring on appropriate independent shot/possession data, jointly model turnover/possession transitions, then validate match forecasts and action scenarios on held-out matches. Do not train on the screenshot benchmark or claim that these user-entered scenarios validate the trained passing model.
