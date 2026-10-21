"""Synthetic software fixtures only; these are NOT real-football validation."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from benchmark_screenshots import validate,project,evaluate,ROOT

class BenchmarkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        (ROOT/'work/screenshot-benchmark').mkdir(parents=True,exist_ok=True)

    def test_empty_benchmark_never_claims_validation(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'work/screenshot-benchmark') as d:
            p=Path(d)/'manifest.json';p.write_text(json.dumps({'attempts':[]}))
            result=evaluate(p)
            self.assertEqual(result['scored_attempts'],0)
            self.assertIsNone(result['coverage'])
            self.assertFalse(result['production_approved'])
            self.assertNotIn('metrics',result)

    def test_outcome_and_independent_review_required(self):
        self.assertEqual(validate({'abstention':'unknown_target'},Path('.'),set()),'unknown_target')
        self.assertEqual(validate({'source_dataset':'SkillCorner','match_id':'1'},Path('.'),{'1'}),'previously_used_match')
        r={k:'fixture' for k in ['id','source_url','source_dataset','match_id','image_sha256','marker','outcome_reviewer','clip_reference']}
        self.assertEqual(validate(r,Path('.'),set()),'independent_outcome_review_required')
        r.update(outcome_reviewer='reviewer2',real_image=True,marked_before_outcome_review=True,all_visible_defenders_marked=True,release_frame_verified=True)
        self.assertEqual(validate(r,Path('.'),set()),'unknown_outcome')

    def test_actual_app_projection(self):
        row={'id':'synthetic-unit-fixture','pitch_length':105,'pitch_width':68,'region':'full',
             'corners':[{'x':0,'y':0},{'x':1,'y':0},{'x':1,'y':1},{'x':0,'y':1}],
             'players':[{'id':'a','team':'home','x':.25,'y':.5},{'id':'b','team':'home','x':.75,'y':.5},{'id':'d','team':'away','x':.5,'y':.6}],
             'passer':'a','target':'b'}
        p=project([row])[0];self.assertAlmostEqual(p['passer']['x'],26.25);self.assertAlmostEqual(p['target']['x'],78.75)
        row['corners'][1],row['corners'][2]=row['corners'][2],row['corners'][1]
        self.assertIn('error',project([row])[0])

    def test_image_integrity(self):
        with tempfile.TemporaryDirectory(dir=ROOT/'work/screenshot-benchmark') as d:
            p=Path(d)/'fixture.png';p.write_bytes(b'not a football image; validation unit fixture')
            r={k:'fixture' for k in ['id','source_url','source_dataset','match_id','marker','clip_reference']}
            r.update(image='fixture.png',image_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),outcome_reviewer='reviewer2',real_image=True,marked_before_outcome_review=True,all_visible_defenders_marked=True,release_frame_verified=True,outcome='successful')
            self.assertIsNone(validate(r,Path(d),set()))
            p.write_bytes(b'changed');self.assertEqual(validate(r,Path(d),set()),'image_hash_mismatch')

if __name__=='__main__':unittest.main()
