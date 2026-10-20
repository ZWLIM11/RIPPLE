"""Release-context features only: deliberately no observed endpoint or recipient."""
import math

FEATURES = ["start_x", "start_y", "under_pressure", "left_foot",
            "distance_to_goal", "distance_from_centre", "x_squared",
            "y_squared", "xy"]
FAILURES = {"Incomplete", "Out", "Pass Offside"}


def features(x, y, pressure, left_foot):
    if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in [x, y]):
        raise ValueError("Finite start coordinates required")
    if not (0 <= x <= 120 and 0 <= y <= 80):
        raise ValueError("StatsBomb coordinates out of range")
    if pressure not in (0, 1) or left_foot not in (0, 1):
        raise ValueError("Binary pressure and foot required")
    return [x, y, int(pressure), int(left_foot), math.hypot(120-x, 40-y),
            abs(40-y), x*x, y*y, x*y]


def extract(event):
    if event.get("type", {}).get("name") != "Pass":
        return None
    p = event.get("pass", {})
    # Restrict to ground foot passes without an explicit restart/recovery type.
    if p.get("height", {}).get("name") != "Ground Pass" or p.get("type"):
        return None
    foot = p.get("body_part", {}).get("name")
    if foot not in ("Left Foot", "Right Foot"):
        return None
    outcome = p.get("outcome", {}).get("name")
    if outcome is not None and outcome not in FAILURES:
        return None  # Unknown/injury-clearance are not reliable binary labels.
    location = event.get("location")
    if not isinstance(location, list) or len(location) != 2:
        return None
    pressure = event.get("under_pressure", False)
    if not isinstance(pressure, bool):
        return None
    try:
        values = features(*location, int(pressure), int(foot == "Left Foot"))
    except ValueError:
        return None
    return values, int(outcome is None)
