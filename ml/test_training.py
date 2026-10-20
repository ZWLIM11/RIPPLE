import copy
import json
from pathlib import Path
import unittest

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.metrics import log_loss

from features import FEATURES, extract, features
from train import ARTIFACTS, REPORT, load, split_matches


def event():
    return {"type": {"name": "Pass"}, "location": [42.3, 29.8],
            "under_pressure": True,
            "pass": {"height": {"name": "Ground Pass"},
                     "body_part": {"name": "Left Foot"}}}


class ExtractionTests(unittest.TestCase):
    def test_labels_follow_statsbomb_absent_outcome_convention(self):
        e = event()
        self.assertEqual(extract(e)[1], 1)
        for outcome in ("Incomplete", "Out", "Pass Offside"):
            e["pass"]["outcome"] = {"name": outcome}
            self.assertEqual(extract(e)[1], 0)
        for outcome in ("Unknown", "Injury Clearance", "new unrecognized outcome"):
            e["pass"]["outcome"] = {"name": outcome}
            self.assertIsNone(extract(e))

    def test_post_action_fields_and_label_cannot_change_features(self):
        original = event()
        before = copy.deepcopy(original)
        sample = extract(original)
        changed = copy.deepcopy(original)
        changed.update({"duration": 5, "player": {"id": 999}, "team": {"id": 999},
                        "related_events": ["future"], "out": True})
        changed["pass"].update({"outcome": {"name": "Incomplete"},
                                "end_location": [-1000, 1000], "length": 999,
                                "angle": 999, "recipient": {"id": 999},
                                "goal_assist": True, "shot_assist": True,
                                "assisted_shot_id": "future"})
        self.assertEqual(sample[0], extract(changed)[0])
        self.assertNotEqual(sample[1], extract(changed)[1])
        self.assertEqual(original, before)

    def test_scope_excludes_non_ground_non_foot_and_restarts(self):
        for key, value in [("height", "High Pass"), ("body_part", "Head"), ("type", "Throw-in")]:
            e = event()
            e["pass"][key] = {"name": value}
            self.assertIsNone(extract(e))
        e = event()
        e["type"]["name"] = "Shot"
        self.assertIsNone(extract(e))

    def test_missing_pressure_means_false_and_invalid_inputs_are_rejected(self):
        e = event()
        del e["under_pressure"]
        self.assertEqual(extract(e)[0][FEATURES.index("under_pressure")], 0)
        for location in ([float("nan"), 20], [121, 20], [-1, 0], [20, 81], None):
            e["location"] = location
            self.assertIsNone(extract(e))
        with self.assertRaises(ValueError):
            features(50, 30, 2, 1)

    def test_match_partitions_are_disjoint_and_test_is_later_tournament(self):
        frame = pd.DataFrame([{"match_id": i, "year": 2018 if i < 64 else 2022}
                              for i in range(128) for _ in range(2)])
        parts, ids = split_matches(frame)
        self.assertEqual([len(ids[k]) for k in parts], [40, 12, 12, 64])
        for name, mid in ids.items():
            for other, other_ids in ids.items():
                if name != other:
                    self.assertFalse(set(mid) & set(other_ids))
        self.assertTrue((parts["test"].year == 2022).all())
        self.assertEqual(ids, split_matches(frame)[1])


@unittest.skipUnless((ARTIFACTS / "context-catboost.cbm").exists(),
                     "Train first to verify local research artifacts")
class ArtifactTests(unittest.TestCase):
    def test_saved_model_reproduces_report_and_holdout_predictions(self):
        report = json.loads(REPORT.read_text(encoding="utf-8"))
        frame, _ = load()  # Includes every input file checksum verification.
        parts, ids = split_matches(frame)
        test = parts["test"]
        model = CatBoostClassifier()
        model.load_model(str(ARTIFACTS / "context-catboost.cbm"))
        self.assertEqual(model.feature_names_, FEATURES)
        raw = model.predict(test[FEATURES], prediction_type="RawFormulaVal")
        calibration = report["calibration"]
        probability = 1/(1+np.exp(-(raw*calibration["coefficient"]+calibration["intercept"])))
        saved = pd.read_csv(ARTIFACTS / "holdout-predictions.csv")
        np.testing.assert_array_equal(saved.match_id, test.match_id)
        np.testing.assert_array_equal(saved.label, test.label)
        np.testing.assert_allclose(saved.catboost, probability, atol=1e-12, rtol=0)
        self.assertAlmostEqual(log_loss(test.label, probability),
                               report["test_metrics"]["catboost_calibrated"]["log_loss"], places=12)
        self.assertEqual(report["statistical_gate_passed"], all(report["promotion_checks"].values()))


if __name__ == "__main__":
    unittest.main()
