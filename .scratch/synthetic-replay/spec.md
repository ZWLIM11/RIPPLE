# Synthetic replay and Before the pass

Create a deterministic sequence of fictional passing decisions with 22-player decision
snapshots, candidate choices and independently generated observed outcomes. Reuse the
existing PassingModel for recommendations using only each decision snapshot.
Support reveal, previous/next, seeking and autoplay. Lock board edits during replay.
Provide fan/analyst templates, player focus, observed-event evidence, recap and JSON export.
Exclude the current hidden outcome and all future outcomes from recap and export.
Seeking treats earlier timeline events as observed history.

Scope: static snapshot replay, not video tracking or continuous motion. Heuristic
recommendations and toy simulated outcomes are not calibrated real-world probabilities.
Foundry and broadcast overlay integration remain later milestones.
