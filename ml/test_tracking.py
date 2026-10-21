import json
import unittest
import numpy as np
import pandas as pd
from catboost import CatBoostRanker
from unittest.mock import patch
from train_tracking import ROOT, ART, FEATURES, geometry, release_positions, ranking, extract


class TrackingTests(unittest.TestCase):
    def test_release_lookup_ignores_future_frames_and_requires_complete_team(self):
        players=[(f'Player{i}',3+2*i) for i in range(11)]
        values={0:[1,1],**{c:[.2,.9] for _,col in players for c in [col,col+1]}}
        table=pd.DataFrame(values,index=[100,101])
        first=release_positions(table,players,100,1)
        table.loc[101,:]=np.nan
        again=release_positions(table,players,100,1)
        for name in first:np.testing.assert_array_equal(first[name],again[name])
        table.loc[100,3]=np.nan
        with self.assertRaises(ValueError):release_positions(table,players,100,1)

    def test_geometry_is_translation_consistent_for_distance_and_detects_lane_defender(self):
        a=[10,20];b=[30,20];defenders=[[20,21]]+[[90,50]]*10
        f=geometry(a,b,defenders)
        self.assertEqual(f[0],20);self.assertEqual(f[-2],1);self.assertEqual(f[-1],1)
        with self.assertRaises(ValueError):geometry(a,a,defenders)
        with self.assertRaises(ValueError):geometry(a,b,defenders[:10])

    def test_each_choice_has_one_label_and_all_candidates_share_release_frame(self):
        for fold in ['train1_test2','train2_test1']:
            data=pd.read_csv(ART/f'{fold}.csv')
            grouped=data.groupby('event')
            self.assertTrue((grouped.chosen.sum()==1).all())
            self.assertTrue((grouped.size()==10).all())
            self.assertTrue((grouped.frame.nunique()==1).all())
            self.assertTrue(np.isfinite(data[FEATURES].to_numpy()).all())

    def test_post_event_coordinates_and_times_cannot_change_features(self):
        baseline,_,_=extract(1)
        read=pd.read_csv
        def altered(path,*args,**kwargs):
            data=read(path,*args,**kwargs)
            if str(path).endswith('events1.csv'):
                for col in ['End X','End Y','End Frame','End Time [s]']:data[col]=-999
            return data
        with patch('train_tracking.pd.read_csv',side_effect=altered):changed,_,_=extract(1)
        pd.testing.assert_frame_equal(baseline,changed)

    def test_saved_models_reproduce_all_heldout_scores_and_ranking_metrics(self):
        report=json.loads((ROOT/'ml/tracking-evaluation.json').read_text())
        self.assertFalse(report['production_approved'])
        for fold in report['folds']:
            name=f"train{fold['train_game']}_test{fold['test_game']}"
            self.assertNotEqual(fold['train_game'],fold['test_game'])
            data=pd.read_csv(ART/f'{name}.csv');model=CatBoostRanker();model.load_model(str(ART/f'{name}.cbm'))
            scores=model.predict(data[FEATURES]);np.testing.assert_allclose(scores,data.catboost,atol=1e-12)
            metrics,_=ranking(data,scores)
            for key,value in metrics.items():self.assertAlmostEqual(value,fold['metrics']['catboost'][key],places=12)


if __name__=='__main__':unittest.main()
