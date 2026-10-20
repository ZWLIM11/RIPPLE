# Candidate pass comparison

Preserve the existing offline tactical-board prototype and heuristic model.
Let a viewer pin the inspected candidate pass and its decision state, change the board,
and compare the same receiver, fixed target, speed and passing foot under the new state.
If the passer changes or possession disappears, comparison must stop until restored.
Export both decision states and calculation results, explicitly labelled as estimates.
No observed outcome, calibrated probability or trained model is introduced.

Validation: Node built-in tests exercise the actual inline pure calculation module,
including both attack directions, ball travel, non-mutating recommendation, candidate
enumeration and the same candidate's response to a blocking defender.
