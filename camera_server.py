import cv2
import numpy as np
import time
import threading
import asyncio
import websockets
import requests
from ultralytics import YOLO
from flask import Flask, Response
from flask_cors import CORS

# ========== Flask ==========
app = Flask(__name__)
CORS(app)

# ========== Config ==========
FIRE_MODEL_PATH   = 'models/fire_model.pt'
WEAPON_MODEL_PATH = 'models/weapon_model.pt'

FIRE_API_URL   = "https://meko.tryasp.net/api/v1/iot/fire-alert"
WEAPON_API_URL = "https://meko.tryasp.net/api/v1/iot/theft-alert"
PARKING_UUID   = "019ee129-c760-70e5-8f66-c2def83b5d64"
DEVICE_KEY     = "my_secret_key_123"

ALERT_COOLDOWN = 60.0
WEAPON_CLASSES = ['Knife', 'Gun']

# ========== Shared State ==========
current_frame     = None
latest_detections = []
frame_lock        = threading.Lock()
_last_alert       = {'fire': 0, 'weapon': 0}
_alert_lock       = threading.Lock()
latest_camera_alert = {'type': None, 'label': '', 'ts': 0}  # instant status for dashboard

# ========== Alert Sender ==========
def send_alert(alert_type, confidence, label=""):
    now = time.time()
    with _alert_lock:
        if now - _last_alert[alert_type] < ALERT_COOLDOWN:
            return
        _last_alert[alert_type] = now

    # Store instantly so /status responds before the API call finishes
    latest_camera_alert['type']  = alert_type
    latest_camera_alert['label'] = label or alert_type
    latest_camera_alert['ts']    = now
    try:
        if alert_type == 'fire':
            requests.post(FIRE_API_URL, params={
                "parking_id": PARKING_UUID,
                "message": "Fire detected by AI Camera",
                "confidence": round(confidence, 4),
                "device_key": DEVICE_KEY,
                "skipRedirect": "true"
            }, timeout=2)
            print("Fire alert sent!")
        else:
            requests.post(WEAPON_API_URL, params={
                "parking_id": PARKING_UUID,
                "weapon_type": label,
                "confidence": round(confidence, 4),
                "device_key": DEVICE_KEY,
                "skipRedirect": "true"
            }, timeout=2)
            print(f"Weapon alert sent! ({label})")
    except:
        pass

# ========== AI Worker ==========
def ai_worker():
    global latest_detections
    try:
        fire_model   = YOLO(FIRE_MODEL_PATH)
        weapon_model = YOLO(WEAPON_MODEL_PATH)
        print("[AI] Models loaded OK")
    except Exception as e:
        print(f"[AI] Model load failed: {e}")
        return

    while True:
        with frame_lock:
            if current_frame is None:
                time.sleep(0.05)
                continue
            frame = current_frame.copy()

        resized = cv2.resize(frame, (640, 480))
        dets = []

        for box in fire_model.predict(resized, conf=0.4, verbose=False)[0].boxes:
            conf = float(box.conf[0])
            dets.append({
                "box":   box.xyxy[0].cpu().numpy(),
                "label": f"Fire {int(conf*100)}%",
                "color": (0, 165, 255)
            })
            send_alert('fire', conf)

        for box in weapon_model.predict(resized, conf=0.45, verbose=False)[0].boxes:
            cls_id = int(box.cls[0])
            label  = WEAPON_CLASSES[cls_id] if cls_id < len(WEAPON_CLASSES) else "Weapon"
            conf   = float(box.conf[0])
            min_conf = 0.50 if label == 'Gun' else 0.15
            if conf >= min_conf:
                dets.append({
                    "box":   box.xyxy[0].cpu().numpy(),
                    "label": f"{label} {int(conf*100)}%",
                    "color": (0, 0, 255)
                })
                send_alert('weapon', conf, label)

        with frame_lock:
            latest_detections = dets

# ========== MJPEG Stream ==========
def generate_frames():
    while True:
        with frame_lock:
            if current_frame is None:
                time.sleep(0.05)
                continue
            frame = current_frame.copy()
            boxes = list(latest_detections)

        h, w = frame.shape[:2]
        sx, sy = w / 640, h / 480
        danger = False

        for item in boxes:
            x1, y1, x2, y2 = item["box"]
            x1, y1, x2, y2 = int(x1*sx), int(y1*sy), int(x2*sx), int(y2*sy)
            cv2.rectangle(frame, (x1, y1), (x2, y2), item["color"], 3)
            cv2.putText(frame, item["label"], (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            danger = True

        if danger:
            cv2.rectangle(frame, (0, 0), (w - 1, h - 1), (0, 0, 255), 8)

        _, buf = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def status():
    from flask import jsonify
    alert = latest_camera_alert
    # only report alerts newer than 10 seconds
    if alert['type'] and (time.time() - alert['ts']) < 10:
        return jsonify({'detection': alert['type'], 'label': alert['label'], 'ts': alert['ts']})
    return jsonify({'detection': None})

# ========== WebSocket Server (phone → Python) ==========
async def phone_handler(websocket):
    global current_frame
    print("[WS] Phone connected")
    try:
        async for message in websocket:
            if isinstance(message, bytes) and len(message) > 1:
                # First byte = cam ID (sent by phone-cam.html) — skip it
                arr   = np.frombuffer(message[1:], np.uint8)
                frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if frame is not None:
                    with frame_lock:
                        current_frame = frame
    except websockets.exceptions.ConnectionClosed:
        pass
    print("[WS] Phone disconnected")

async def ws_main():
    async with websockets.serve(phone_handler, "0.0.0.0", 8765):
        print("[WS] Listening on ws://0.0.0.0:8765")
        await asyncio.Future()

def start_ws():
    asyncio.run(ws_main())

if __name__ == "__main__":
    threading.Thread(target=start_ws,   daemon=True).start()
    threading.Thread(target=ai_worker,  daemon=True).start()
    print("[HTTP] MJPEG stream → http://0.0.0.0:5000/video_feed")
    app.run(host='0.0.0.0', port=5000, threaded=True)
