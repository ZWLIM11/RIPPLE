import unittest
from audit_transitions import audit,summarize

def event(t,kind,team=1,**kw):
    return dict(timestamp=f'00:00:{t:06.3f}',period=1,type={'name':kind},team={'id':team},possession=1,**kw)
class AuditTests(unittest.TestCase):
    def test_no_observed_goals_does_not_assert_zero_uncertainty(self):
        p=event(1,'Pass',**{'pass':{'height':{'name':'Ground Pass'}}})
        rows,_=audit([p,event(30,'Half End')],1,2)
        result=summarize({1:rows})
        self.assertIsNone(result['opponent_goal_window_rate_95'])
        self.assertIn('cannot establish zero risk',result['uncertainty_note'])
    def test_completed_pass_opponent_goal_is_not_hidden(self):
        p=event(1,'Pass',**{'pass':{'height':{'name':'Ground Pass'}}})
        shot=event(5,'Shot',2,shot={'type':{'name':'Open Play'},'outcome':{'name':'Goal'}})
        rows,_=audit([p,shot,event(30,'Half End')],1,2)
        self.assertEqual(rows[0]['branch'],'omitted_completed_pass_opponent_goal')
    def test_own_goal_duplicate_is_counted_once(self):
        p=event(1,'Pass',**{'pass':{'height':{'name':'Ground Pass'}}})
        rows,_=audit([p,event(5,'Own Goal Against',2),event(5,'Own Goal For'),event(30,'Half End')],1,2)
        self.assertEqual(rows[0]['branch'],'goal');self.assertEqual(rows[0]['own_goal'],1)
    def test_period_boundary_and_future_exclusion(self):
        p=event(1,'Pass',**{'pass':{'height':{'name':'Ground Pass'}}})
        rows,excluded=audit([p,event(10,'Half End')],1,2)
        self.assertEqual(rows,[]);self.assertEqual(excluded['period_boundary_censored'],1)
        rows,_=audit([p,event(17,'Own Goal Against',1),event(30,'Half End')],1,2)
        self.assertEqual(rows[0]['opponent_goal'],0)
    def test_failed_pass_own_goal_is_omitted_branch(self):
        p=event(1,'Pass',**{'pass':{'height':{'name':'Ground Pass'},'outcome':{'name':'Incomplete'}}})
        rows,_=audit([p,event(5,'Own Goal Against',2),event(30,'Half End')],1,2)
        self.assertEqual(rows[0]['branch'],'omitted_failed_pass_own_goal')
if __name__=='__main__':unittest.main()
