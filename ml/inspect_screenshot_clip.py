"""Reproduce the 118577 input-feasibility pilot; not an outcome accuracy test."""
import argparse
import hashlib
import json
from pathlib import Path
import cv2
import numpy as np

EXPECTED='f0dfbef3b496867bd2a1261c9a4d4c538d3861bf15b50109e9287c6a1371fc04'
TIMES=[0,30,60,120,180,230]

def inspect(path,out):
    path=Path(path);out=Path(out);out.mkdir(parents=True,exist_ok=True)
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if digest!=EXPECTED:raise ValueError('This audit applies only to the verified 118577 source clip')
    cap=cv2.VideoCapture(str(path))
    fps=cap.get(cv2.CAP_PROP_FPS);count=int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width=int(cap.get(cv2.CAP_PROP_FRAME_WIDTH));height=int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    samples=[]
    try:
        for seconds in TIMES:
            frame=int(round(seconds*fps));cap.set(cv2.CAP_PROP_POS_FRAMES,frame)
            ok,image=cap.read()
            if not ok:raise ValueError(f'Cannot decode sample at {seconds}s')
            dest=out/f'118577-{seconds}s.jpg'
            if not cv2.imwrite(str(dest),image):raise ValueError('Cannot save frame')
            samples.append({'seconds':seconds,'frame_index_zero_based':frame,'image':dest.name,
                            'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
    finally:cap.release()
    # Approximate manual points on the near touchline in the 30s frame,
    # observed at 2048x540 display size. This is a curvature diagnostic,
    # NOT an independently annotated ground-truth calibration error in metres.
    a,b,p=np.array([50.,300.]),np.array([1969.,274.]),np.array([1066.,357.])
    v=b-a;offset=abs(v[0]*(p-a)[1]-v[1]*(p-a)[0])/np.linalg.norm(v)
    return {'source_url':'https://huggingface.co/datasets/atomscott/soccertrack-v2/blob/main/mot/clips/118577.mp4',
            'source_sha256':digest,'source_bytes':path.stat().st_size,'fps':fps,'frame_count':count,
            'duration_seconds':count/fps,'width':width,'height':height,'samples':samples,
            'manual_line_diagnostic':{'display_size':[2048,540],'endpoints':[a.tolist(),b.tolist()],
                'intermediate_point':p.tolist(),'offset_display_pixels':float(offset),
                'offset_native_pixels':float(offset*width/2048),'approximate_manual_measurement':True},
            'visual_review':'All six sampled frames show a curved near touchline in the fixed panoramic view.',
            'input_feasibility':'unsupported_without_distortion_correction',
            'scope':'Full-pitch four-corner calibration; local-region calibration not evaluated.',
            'pass_outcomes_scored':0,'production_approved':False,
            'limitations':['One four-minute clip, six time samples, not a pass-outcome benchmark.',
                           'Previously downloaded 117092 event annotations are a different match and were not used.',
                           'No independently reviewed intended targets/outcomes or camera rectification for this clip.',
                           'A planar homography preserves straight lines and cannot rectify this curved touchline.']}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('video');p.add_argument('--frames',default='work/screenshot-benchmark');p.add_argument('--report',default='ml/screenshot-pilot-118577.json');args=p.parse_args()
    report=inspect(args.video,args.frames);Path(args.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='samples'},indent=2))
