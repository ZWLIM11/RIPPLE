# Pass Detective

**Shot opportunity**: An uncalibrated geometry heuristic for a potential shooting position. Not xG or the probability of getting a shot away.

**Experimental match outlook**: Win, draw and loss probabilities under independent Poisson goal counts with user-assumed future scoring rates.

**Illustrative action impact**: Expected post-action win probability minus baseline under explicit user-assumed outcome branches, expressed in percentage points. Not validated Win Probability Added.

Pass Detective explains passing decisions and their match context to football fans using synthetic matches.

## Language

**Passer**:
The player in possession who can attempt a pass.

**Receiver**:
The teammate a pass is intended to reach.

**Tactical role**:
A player's football responsibility within the team's current shape. A tactical role is distinct from a shirt number.

**Candidate pass**:
A possible pass defined by its intended receiver, target location, ball speed, and passing foot.
_Avoid_: Prediction

**Passing prediction**:
An estimate of a candidate pass's travel, interception risk or control feasibility
under the current model assumptions. It is distinct from the candidate pass itself,
the passer's actual choice, an observed outcome, and a calibrated completion probability.

**Passing recommendation**:
An assessment of candidate passes under a stated objective using information available at the decision moment. It does not guarantee an outcome or predict the passer's actual choice.

**Interception margin**:
The difference between a defender's estimated arrival time and the ball's estimated arrival time at a location along a passing route, measured from the same decision moment. A positive margin means the ball arrives first under the model's assumptions.

**Passing foot**:
The foot used by the passer to strike the ball.

**Receiving foot**:
The foot toward which the pass is directed for the receiver's intended first touch.

**Observed outcome**:
What actually happens in the synthetic match after an action, distinct from an estimated outcome of an alternative action.

**Match insight**:
An explanation connecting supported match evidence to its football significance.

**Match recap**:
A summary of observed match events and supported match insights, adapted to the viewer's preferences.

**Safest option**:
The candidate pass ranked highest for retaining possession under the model's assumptions.

**Attacking option**:
The candidate pass ranked highest for advancing the attack while accounting for execution and turnover risk.

**Difficulty rating**:
A heuristic assessment of how demanding a pass is to execute and control. It is distinct from a calibrated completion probability.

**Completion-context model**:
A research classifier estimating observed ground-pass completion from release
location, annotated pressure and passing foot. It does not distinguish alternative
receivers and is not currently used by the tactical board.

**Decision flip**:
A change in the leading viable receiver found in a bounded hypothetical defender displacement search. Not a guaranteed minimum perturbation or prediction of movement.
