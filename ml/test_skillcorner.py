"""Data isolation and saved-model audit; requires local pinned research artifacts."""
import copy
import hashlib
import json
import unittest
from types import SimpleNamespace
import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from train_skillcorner import ART,DATA,ROOT,FEATURES,positions,geometry,predict,metrics

class Audit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report=json.loads((ROOT/'ml/skillcorner-evaluation.json').read_text(encoding='utf-8'))

    def test_match_partitions(self):
        splits=self.report['splits'];groups=[set(splits[k]) for k in ['train','calibration','test']]
        self.assertEqual([len(g) for g in groups],[12,4,4])
        self.assertFalse(groups[0]&groups[1] or groups[0]&groups[2] or groups[1]&groups[2])
        dates=lambda ids:[json.loads((DATA/str(i)/'match.json').read_text(encoding='utf-8'))['date_time'] for i in ids]
        self.assertLessEqual(max(dates(groups[0])),min(dates(groups[1])))
        self.assertLessEqual(max(dates(groups[1])),min(dates(groups[2])))

    def test_source_hashes(self):
        for manifest in self.report['source_manifests']:
            folder=DATA/str(manifest['match'])
            for name in ['events.csv','match.json','release.json']:
                self.assertEqual(hashlib.sha256((folder/name).read_bytes()).hexdigest(),manifest['hashes'][name])

    def test_future_and_outcome_fields_ignored(self):
        folder=DATA/'1874553'
        meta=json.loads((folder/'match.json').read_text(encoding='utf-8'));frames=json.loads((folder/'release.json').read_text(encoding='utf-8'))
        byframe={f['frame']:f for f in frames}
        events=pd.read_csv(folder/'events.csv',low_memory=False)
        event=events[(events.event_type=='player_possession')&events.pass_outcome.eq('unsuccessful')].iloc[0].to_dict()
        frame=byframe[int(event['frame_end'])]
        before=positions(SimpleNamespace(**event),frame,meta,True)
        for key in ['pass_outcome','x_end','y_end','player_targeted_x_reception','player_targeted_y_reception','player_targeted_xpass_completion','xpass_completion','speed_avg']:
            event[key]=-999
        after=positions(SimpleNamespace(**event),frame,meta,True)
        for a,b in zip(before,after):np.testing.assert_array_equal(a,b)
        bad=copy.deepcopy(frame);bad['frame']+=1
        with self.assertRaises(ValueError):positions(SimpleNamespace(**event),bad,meta,True)

    def test_offscreen_players_are_excluded(self):
        meta={'players':[{'id':1,'team_id':10},{'id':2,'team_id':10},{'id':3,'team_id':20},{'id':4,'team_id':20}], 'pitch_length':105,'pitch_width':68}
        event=SimpleNamespace(frame_end=100,period=1,player_id=1,player_targeted_id=2)
        frame={'frame':100,'period':1,'player_data':[{'player_id':i,'x':float(i),'y':0.,'is_detected':i!=4} for i in range(1,5)]}
        a,b,d=positions(event,frame,meta,True);self.assertEqual(len(d),1)
        frame['player_data'][1]['is_detected']=False
        with self.assertRaises(ValueError):positions(event,frame,meta,True)

    def test_geometry(self):
        f=geometry([0,0],[10,0],[[5,2]],105,68)
        self.assertEqual(f[0],10);self.assertEqual(f[9],2);self.assertEqual(f[10:], [1,1])
        with self.assertRaises(ValueError):geometry([0,0],[10,0],[],105,68)

    def test_models_reproduce_scores_and_metrics(self):
        for name in ['complete','visible']:
            data=pd.read_csv(ART/f'{name}-test.csv');model=CatBoostClassifier();model.load_model(str(ART/f'{name}.cbm'))
            bundle=joblib.load(ART/f'{name}.joblib')
            p=predict(model,bundle['calibrator'],data[FEATURES])
            np.testing.assert_allclose(p,data.catboost,atol=1e-12)
            q=bundle['logistic_cal'].predict_proba(bundle['logistic'].decision_function(data[FEATURES]).reshape(-1,1))[:,1]
            np.testing.assert_allclose(q,data.logistic,atol=1e-12)
            self.assertFalse(data.duplicated(['match','event']).any())
            self.assertEqual(set(data['match']),set(self.report['splits']['test']))
            for k,v in metrics(data.completed,p).items():self.assertAlmostEqual(v,self.report['experiments'][name]['metrics']['catboost'][k])

if __name__=='__main__':unittest.main()
