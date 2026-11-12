// Device orientation tilt. Works relative to a slowly drifting baseline, so the card sits
// level however the phone is held and only reacts to the hand's movement.
// iOS needs DeviceOrientationEvent.requestPermission() from a user gesture: `needsPermission`
// tells the UI to offer a button for it; elsewhere listening starts straight away and the
// feature counts as available once a real reading arrives.

const RANGE = 0.32; // radians of card tilt at most
const GAIN = 0.022; // radians of card tilt per degree of phone tilt
const DRIFT = 0.35; // 1/s, how quickly the baseline follows a held pose

export function createGyro(motion, { onAvailable } = {}) {
  const supported = typeof window !== "undefined" && "DeviceOrientationEvent" in window;
  const needsPermission = supported && typeof DeviceOrientationEvent.requestPermission === "function";
  let base = null;
  let last = performance.now();
  let listening = false;
  let available = false;

  const handler = (e) => {
    if (e.beta == null || e.gamma == null) return;
    if (!available) {
      available = true;
      onAvailable?.();
    }
    // map to screen axes when the phone is in landscape
    const angle = (screen.orientation?.angle ?? window.orientation ?? 0) % 360;
    let x = e.beta; // front-back
    let y = e.gamma; // left-right
    if (angle === 90) [x, y] = [-e.gamma, e.beta];
    else if (angle === 270 || angle === -90) [x, y] = [e.gamma, -e.beta];
    else if (angle === 180) [x, y] = [-e.beta, -e.gamma];

    const now = performance.now();
    const dt = Math.min(0.2, (now - last) / 1000);
    last = now;
    if (!base) base = { x, y };
    const a = 1 - Math.exp(-DRIFT * dt);
    base.x += (x - base.x) * a;
    base.y += (y - base.y) * a;
    const clamp = (v) => Math.max(-RANGE, Math.min(RANGE, v));
    motion.gyro.x = clamp((x - base.x) * GAIN);
    motion.gyro.y = clamp((y - base.y) * GAIN);
  };

  const listen = () => {
    if (listening) return;
    listening = true;
    window.addEventListener("deviceorientation", handler);
  };

  if (supported && !needsPermission) listen();

  return {
    needsPermission,
    get enabled() {
      return listening && available;
    },
    async request() {
      if (!needsPermission) return listen(), true;
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === "granted") {
          listen();
          return true;
        }
      } catch {
        /* denied or not from a gesture */
      }
      return false;
    },
    stop() {
      window.removeEventListener("deviceorientation", handler);
      listening = false;
      motion.gyro.x = motion.gyro.y = 0;
    },
  };
}
