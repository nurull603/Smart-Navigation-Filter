"""
SMART NAVIGATION FILTER — Fire Detection Station v2
Runs on laptop webcam. Detects fire/flames via color + brightness + flicker analysis.
Won't trigger on sunsets, red posters, or skin tones.

Usage: python fire_detector.py
Press 'q' to quit.
"""

import cv2
import numpy as np
import time
import os
import firebase_admin
from firebase_admin import credentials, firestore

# ============================================================
# FIREBASE SETUP
# ============================================================
desktop = os.path.join(os.path.expanduser("~"), "Desktop")
key_path = os.path.join(desktop, "firebase-key.json")

if not os.path.exists(key_path):
    print(f"ERROR: Cannot find {key_path}")
    print("Make sure 'firebase-key.json' is on the Desktop.")
    exit(1)

print(f"[OK] Found Firebase key: {key_path}")

cred = credentials.Certificate(key_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("[OK] Connected to Firebase")

# ============================================================
# FIRE DETECTION SETTINGS
# ============================================================
# Tighter HSV ranges — only bright saturated fire colors

# Range 1: Bright orange-yellow flames (core fire)
FIRE_LOW_1 = np.array([5, 150, 200])
FIRE_HIGH_1 = np.array([25, 255, 255])

# Range 2: Red-orange edge of flames
FIRE_LOW_2 = np.array([0, 150, 200])
FIRE_HIGH_2 = np.array([5, 255, 255])

# Range 3: Deep red (only very bright)
FIRE_LOW_3 = np.array([165, 150, 220])
FIRE_HIGH_3 = np.array([180, 255, 255])

FIRE_THRESHOLD_PERCENT = 2.5
MIN_BLOB_AREA = 800
FLICKER_THRESHOLD = 0.4
CONFIRM_FRAMES = 20
ALERT_COOLDOWN = 30

# ============================================================
# MAIN LOOP
# ============================================================
print("\n=== FIRE DETECTION STATION v2 ===")
print("Opening webcam...")

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Cannot open webcam!")
    exit(1)

print("[OK] Webcam opened")
print(f"Detection: {FIRE_THRESHOLD_PERCENT}% threshold, {MIN_BLOB_AREA}px min blob, flicker check ON")
print(f"Confirmation: {CONFIRM_FRAMES} frames | Cooldown: {ALERT_COOLDOWN}s")
print("\nWatching for fire... Press 'q' to quit.\n")

fire_frame_count = 0
last_alert_time = 0
alert_sent = False
frame_count = 0
flicker_history = []

while True:
    ret, frame = cap.read()
    if not ret:
        print("ERROR: Cannot read from webcam")
        break

    frame_count += 1
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    mask1 = cv2.inRange(hsv, FIRE_LOW_1, FIRE_HIGH_1)
    mask2 = cv2.inRange(hsv, FIRE_LOW_2, FIRE_HIGH_2)
    mask3 = cv2.inRange(hsv, FIRE_LOW_3, FIRE_HIGH_3)
    fire_mask = cv2.bitwise_or(mask1, cv2.bitwise_or(mask2, mask3))

    kernel = np.ones((7, 7), np.uint8)
    fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_OPEN, kernel)
    fire_mask = cv2.morphologyEx(fire_mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(fire_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    large_blobs = [c for c in contours if cv2.contourArea(c) > MIN_BLOB_AREA]

    filtered_mask = np.zeros_like(fire_mask)
    if large_blobs:
        cv2.drawContours(filtered_mask, large_blobs, -1, 255, -1)

    total_pixels = filtered_mask.shape[0] * filtered_mask.shape[1]
    fire_pixels = cv2.countNonZero(filtered_mask)
    fire_percent = (fire_pixels / total_pixels) * 100

    flicker_history.append(fire_percent)
    if len(flicker_history) > 15:
        flicker_history.pop(0)

    has_flicker = False
    if len(flicker_history) >= 10:
        flicker_var = max(flicker_history[-10:]) - min(flicker_history[-10:])
        has_flicker = flicker_var > FLICKER_THRESHOLD

    now = time.time()
    is_fire = fire_percent >= FIRE_THRESHOLD_PERCENT and len(large_blobs) >= 1 and has_flicker

    if is_fire:
        fire_frame_count += 1
    else:
        fire_frame_count = max(0, fire_frame_count - 2)

    status_color = (0, 255, 0)
    status_text = "SAFE"

    if fire_frame_count > 0:
        status_color = (0, 255, 255)
        status_text = f"CHECKING... ({fire_frame_count}/{CONFIRM_FRAMES})"

    if fire_frame_count >= CONFIRM_FRAMES:
        status_color = (0, 0, 255)
        status_text = "!! FIRE DETECTED !!"

        if now - last_alert_time > ALERT_COOLDOWN:
            try:
                db.collection("fire_alerts").document("active").set({
                    "active": True,
                    "zone": "elevator",
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "source": "webcam_detector_v2",
                })
                last_alert_time = now
                alert_sent = True
                print(f"\n!!! FIRE ALERT SENT !!! ({fire_percent:.1f}% | {len(large_blobs)} blobs | flicker: {has_flicker})")
                print(f"    Cooldown: {ALERT_COOLDOWN}s\n")
            except Exception as e:
                print(f"Firebase error: {e}")

    if fire_frame_count == 0 and alert_sent and now - last_alert_time > 5:
        try:
            db.collection("fire_alerts").document("active").set({
                "active": False,
                "zone": "",
                "timestamp": firestore.SERVER_TIMESTAMP,
                "source": "webcam_detector_v2",
            })
            alert_sent = False
            print("  [cleared] Fire alert cleared")
        except:
            pass

    cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
    cv2.putText(frame, f"Fire: {fire_percent:.1f}% | Blobs: {len(large_blobs)} | Flicker: {'Y' if has_flicker else 'N'}", (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    if alert_sent:
        remaining = max(0, ALERT_COOLDOWN - (now - last_alert_time))
        if remaining > 0:
            cv2.putText(frame, f"Alert cooldown: {remaining:.0f}s", (10, 85),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 255), 1)

    cv2.drawContours(frame, large_blobs, -1, (0, 0, 255), 2)
    cv2.imshow("Fire Detection Station v2", frame)
    cv2.imshow("Fire Mask", filtered_mask)

    if frame_count % 90 == 0:
        flicker_str = f"{max(flicker_history[-10:]) - min(flicker_history[-10:]):.1f}" if len(flicker_history) >= 10 else "n/a"
        print(f"  [scan] Fire: {fire_percent:.1f}% | Blobs: {len(large_blobs)} | Flicker: {flicker_str} | {fire_frame_count}/{CONFIRM_FRAMES} | {'FIRE!' if fire_frame_count >= CONFIRM_FRAMES else 'safe'}")

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

print("\nShutting down...")
try:
    db.collection("fire_alerts").document("active").set({
        "active": False, "zone": "", "timestamp": firestore.SERVER_TIMESTAMP, "source": "webcam_detector_v2",
    })
    print("[OK] Fire alert cleared")
except:
    pass

cap.release()
cv2.destroyAllWindows()
print("[OK] Done")
