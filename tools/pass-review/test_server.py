import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('review',Path(__file__).with_name('serve.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class RangeTests(unittest.TestCase):
 def test_ranges(self):
  self.assertEqual(m.byte_range(None,100),(0,99,False));self.assertEqual(m.byte_range('bytes=10-19',100),(10,19,True));self.assertEqual(m.byte_range('bytes=-10',100),(90,99,True));self.assertEqual(m.byte_range('bytes=90-',100),(90,99,True))
 def test_invalid(self):
  for value in ['bytes=100-','bytes=20-10','bytes=0-1,4-5','bytes=-0','bad']:
   with self.assertRaises(ValueError):m.byte_range(value,100)
if __name__=='__main__':unittest.main()
