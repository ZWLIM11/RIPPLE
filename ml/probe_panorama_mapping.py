"""Research-only boundary-fit / interior-holdout calibration diagnostic.

Provider landmarks are not independent human validation. No pass model is fitted.
"""
import argparse
import ast
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from scipy.interpolate import RBFInterpolator


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path, default=Path('work/screenshot-benchmark'))
    parser.add_argument('--report', type=Path, default=Path('ml/panorama-mapping-118577.json'))
    args = parser.parse_args()
    source = args.data / '118577_keypoints.json'
    labels = json.loads(source.read_text())
    pitch = np.array([ast.literal_eval(k) for k in labels], dtype=float)
    pixels = np.array(list(labels.values()), dtype=float)
    boundary = ((pitch[:, 0] == 0) | (pitch[:, 0] == 105)
                | (pitch[:, 1] == 0) | (pitch[:, 1] == 68))
    # Fixed geometry split: every interior landmark is held out, no tuning.
    test = ~boundary
    corners = np.array([labels[k] for k in ['(0,0)', '(105,0)', '(105,68)', '(0,68)']], np.float32)
    h = cv2.getPerspectiveTransform(corners, np.array([[0,0],[105,0],[105,68],[0,68]], np.float32))
    baseline = cv2.perspectiveTransform(pixels[test,None,:], h)[:,0,:]
    normalized = pixels / np.array([4096., 1080.])
    curved = RBFInterpolator(normalized[boundary], pitch[boundary], kernel='thin_plate_spline', smoothing=0)
    prediction = curved(normalized[test])
    def metrics(points):
        errors = np.linalg.norm(points - pitch[test], axis=1)
        return {'mean_error_m': float(errors.mean()), 'median_error_m': float(np.median(errors)),
                'max_error_m': float(errors.max()), 'errors_m': errors.tolist()}
    # Diagnostic image uses the same boundary-only fit, never the holdout points.
    forward = RBFInterpolator(pitch[boundary] / [105.,68.], pixels[boundary],
                              kernel='thin_plate_spline', smoothing=0)
    yy, xx = np.mgrid[0:680, 0:1050]
    grid = np.column_stack([xx.ravel()/1049, yy.ravel()/679])
    remap = forward(grid).reshape(680,1050,2).astype(np.float32)
    frame = cv2.imread(str(args.data / '118577-30s.jpg'))
    if frame is None or frame.shape[:2] != (1080,4096):
        raise ValueError('Expected verified 4096x1080 pilot frame')
    rendered = cv2.remap(frame, remap[:,:,0], remap[:,:,1], cv2.INTER_LINEAR)
    if not cv2.imwrite(str(args.data / '118577-boundary-rectified.jpg'), rendered):
        raise ValueError('Could not save diagnostic')
    report = {'source_url': 'https://huggingface.co/datasets/atomscott/soccertrack-v2/blob/main/raw/118577/118577_keypoints.json',
              'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'fit_landmarks': int(boundary.sum()), 'holdout_landmarks': int(test.sum()),
              'split': 'all boundary points for fitting, all interior points held out; no tuning',
              'holdout_pitch_points': pitch[test].tolist(),
              'four_corner_homography': metrics(baseline), 'boundary_thin_plate_spline': metrics(prediction),
              'pass_outcomes_scored': 0, 'production_approved': False,
              'limitations': ['Provider landmark consistency only; not independent annotation accuracy.',
                             'One fixed camera; no evidence of generalization to broadcast screenshots.',
                             'Forward and inverse splines fitted separately; rectified view is diagnostic only.',
                             'Clip timing, intended receivers and outcomes remain unverified.']}
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
