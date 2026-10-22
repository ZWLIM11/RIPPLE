"""Extraction audits; fixtures are not model-quality evidence."""
import copy
import unittest
from train_outlook import extract, geometry, goals

class Extraction(unittest.TestCase):
    def test_shot_features_do_not_use_result_or_provider_xg(self):
        event={'period':1,'location':[100,40],'type':{'name':'Shot'},'shot':{'type':{'name':'Open Play'},'body_part':{'name':'Left Foot'},'outcome':{'name':'Goal'},'statsbomb_xg':.99}}
        a=extract([event],1,2018)[0][0];other=copy.deepcopy(event);other['shot']['outcome']['name']='Saved';other['shot']['statsbomb_xg']=.001
        b=extract([other],1,2018)[0][0];self.assertNotEqual(a.pop('label'),b.pop('label'));self.assertEqual(a,b)
    def test_creation_requires_completed_ground_pass_and_same_possession(self):
        p={'period':1,'minute':1,'second':0,'possession':4,'location':[40,30],'team':{'id':1},'type':{'name':'Pass'},'pass':{'end_location':[90,40],'height':{'name':'Ground Pass'}}}
        s={'period':1,'minute':1,'second':8,'possession':4,'team':{'id':1},'type':{'name':'Shot'}}
        self.assertEqual(extract([p,s],1,2018)[1][0]['label'],1)
        s['possession']=5;self.assertEqual(extract([p,s],1,2018)[1][0]['label'],0)
        s['possession']=4;s['second']=11;self.assertEqual(extract([p,s],1,2018)[1][0]['label'],0)
        p['pass']['outcome']={'name':'Incomplete'};self.assertEqual(extract([p,s],1,2018)[1],[])
    def test_goals_exclude_extra_time_and_include_own_goals_once(self):
        a={'period':2,'minute':90,'second':1,'team':{'id':1},'type':{'name':'Own Goal Against'}}
        b={**a,'type':{'name':'Own Goal For'},'team':{'id':2}}
        self.assertEqual(goals([a,b,{**a,'period':3}],1,2),[(5401,2)])
    def test_geometry_units(self):
        self.assertAlmostEqual(geometry([120,40])[2],0)
        with self.assertRaises(ValueError):geometry([200,40])

if __name__=='__main__':unittest.main()
