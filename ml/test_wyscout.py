import copy
import json
import unittest
import numpy as np
import pandas as pd
import joblib
from catboost import CatBoostClassifier
from train_wyscout import ROOT, FEATURES, features, calibrated, metrics


class WyscoutTests(unittest.TestCase):
    def test_outcomes_endpoints_and_identities_cannot_change_features(self):
        event = {'positions': [{'x': 43, 'y': 29}, {'x': 95, 'y': 50}], 'tags': [{'id': 1801}], 'playerId': 1}
        altered = copy.deepcopy(event)
        altered.update(tags=[{'id': 1802}], playerId=999, matchId=42)
        altered['positions'][1] = {'x': 1, 'y': 1}
        self.assertEqual(features(event), features(altered))

    def test_invalid_release_positions_rejected(self):
        for x in [-1, 101, float('nan'), float('inf')]:
            with self.assertRaises(ValueError):
                features({'positions': [{'x': x, 'y': 50}]})

    def test_partitions_are_match_disjoint_and_france_is_holdout(self):
        report = json.loads((ROOT/'ml/wyscout-evaluation.json').read_text())
        seen = set()
        for name, group in report['partitions'].items():
            ids = set(group['match_ids'])
            self.assertFalse(seen.intersection(ids));seen.update(ids)
            self.assertEqual(group['competition'], 'France' if name == 'test' else 'England')
        self.assertFalse(report['production_approved'])
        self.assertFalse(report['statistical_gate_passed'])

    def test_saved_model_reproduces_every_holdout_prediction_and_metric(self):
        artifacts = ROOT/'ml/artifacts/wyscout'
        data = pd.read_csv(artifacts/'holdout.csv')
        model = CatBoostClassifier();model.load_model(str(artifacts/'model.cbm'))
        calibration = joblib.load(artifacts/'baselines.joblib')['catboost_calibration']
        p = calibrated(calibration, model.predict_proba(data[FEATURES])[:, 1])
        np.testing.assert_allclose(p, data.catboost, atol=1e-12)
        report = json.loads((ROOT/'ml/wyscout-evaluation.json').read_text())
        for key, value in metrics(data.label.to_numpy(), p).items():
            self.assertAlmostEqual(value, report['test_metrics']['catboost_calibrated'][key], places=10)


if __name__ == '__main__':
    unittest.main()
