import unittest
import numpy as np
from audit_screenshot_robustness import perturb
from train_skillcorner import geometry

class RobustnessTests(unittest.TestCase):
    def test_nearest_lane_defender_removed_without_mutating_source(self):
        a=[0,0];b=[10,0];d=[[5,1],[5,8]]
        aa,bb,dd=perturb(a,b,d,'drop_nearest',42)
        np.testing.assert_equal(dd,[[5,8]])
        self.assertEqual(d,[[5,1],[5,8]])
        np.testing.assert_equal(aa,a);np.testing.assert_equal(bb,b)
    def test_systematic_transform_preserves_relative_translation(self):
        a,b,d=perturb([0,0],[10,0],[[5,1]],'translate_x2',0)
        self.assertEqual(geometry(a,b,d,105,68)[0],10)
        self.assertEqual(geometry(a,b,d,105,68)[9],1)
    def test_missing_defenders_abstain_and_random_is_reproducible(self):
        a,b,d=perturb([0,0],[10,0],[[5,1]],'drop_nearest',0)
        with self.assertRaises(ValueError):geometry(a,b,d,105,68)
        first=perturb([0,0],[10,0],[[5,1],[5,2],[5,3]],'drop_random25',44)
        second=perturb([0,0],[10,0],[[5,1],[5,2],[5,3]],'drop_random25',44)
        for x,y in zip(first,second):np.testing.assert_equal(x,y)
if __name__=='__main__':unittest.main()
