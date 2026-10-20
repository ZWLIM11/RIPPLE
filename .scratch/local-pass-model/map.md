# Local completion-context experiment

## Decisions so far

- [Training and evaluation](issues/01-train-evaluate.md): complete. Statistically
  consistent but small improvement over logistic regression; fails 2% promotion
  gate. Keep trained model local, do not add ML probabilities to the app.

## Remaining research

Validated intended targets, spatial features, fresh holdout data, synthetic-board
domain shift and deployment/submission rights must be addressed before promotion.
