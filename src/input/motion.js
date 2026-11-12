// The card's motion state: yaw / pitch with springs, drag with inertia, flips and spins,
// pointer or gyro tilt on top, and a gentle idle float when nobody is touching it.
//
// Yaw rests on multiples of PI: even = front facing, odd = back facing. Letting go after a
// spin settles on whichever face the throw carries it to, so a hard spin can also flip it.

const PI = Math.PI;
const K = 55; // spring stiffness
const C = 2 * 0.62 * Math.sqrt(K); // slightly under-damped: a small, physical overshoot
const TILT_FOLLOW = 9; // 1/s, how fast tilt chases its target

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class Motion {
  constructor({ reduced = false, still = false, yaw = 0, pitch = 0, side = "front" } = {}) {
    this.reduced = reduced;
    this.still = still;
    this.restYaw = side === "back" ? PI : 0;
    this.yaw = this.restYaw + yaw;
    this.pitch = pitch;
    this.yawV = 0;
    this.pitchV = 0;
    this.dragging = false;
    this.hover = { x: 0, y: 0 };
    this.gyro = { x: 0, y: 0 };
    this.tilt = { x: 0, y: 0 };
    this.idleFor = 0;
    this.idleAmt = 0;
    this.float = 0;
    this.out = { pitch: this.pitch, yaw: this.yaw, roll: 0, lift: 0 };
    this.onSide = null;
    this.side = side;
  }

  get facingBack() {
    return Math.round(this.restYaw / PI) % 2 !== 0;
  }

  poke() {
    this.idleFor = 0;
  }

  flip() {
    this.poke();
    this.restYaw += PI;
    if (this.reduced) this.yaw = this.restYaw;
    this.emitSide();
  }

  // A full turn, used when stepping to another card. Returns the time to the half-way point,
  // when the back faces the camera and the front texture can be swapped unseen.
  spin(dir) {
    this.poke();
    if (this.reduced || this.still) return 0;
    this.restYaw += 2 * PI * dir;
    this.yawV += 6 * dir;
    return 0.24;
  }

  setFacing(back) {
    if (this.facingBack !== back) this.flip();
  }

  beginDrag() {
    this.dragging = true;
    this.poke();
    this.dragYaw = this.yaw;
    this.dragPitch = this.pitch;
  }

  drag(dYaw, dPitch, vYaw, vPitch) {
    this.yaw = this.dragYaw + dYaw;
    // pitch resists more the further it goes (soft limit at ~75 degrees)
    const raw = this.dragPitch + dPitch;
    this.pitch = Math.sign(raw) * 1.3 * Math.tanh(Math.abs(raw) / 1.3);
    this.yawV = vYaw;
    this.pitchV = vPitch;
    this.poke();
  }

  endDrag() {
    this.dragging = false;
    this.yawV = clamp(this.yawV, -28, 28);
    const projected = this.yaw + this.yawV * 0.32;
    this.restYaw = Math.round(projected / PI) * PI;
    this.emitSide();
    this.poke();
  }

  emitSide() {
    const side = this.facingBack ? "back" : "front";
    if (side !== this.side) {
      this.side = side;
      this.onSide?.(side);
    }
  }

  update(dt, time) {
    if (this.still) {
      this.out.pitch = this.pitch;
      this.out.yaw = this.yaw;
      return this.out;
    }
    dt = Math.min(dt, 1 / 30);
    if (!this.dragging) {
      // two sub-steps keep the spring stable at low frame rates
      for (let i = 0; i < 2; i++) {
        const h = dt / 2;
        this.yawV += (K * (this.restYaw - this.yaw) - C * this.yawV) * h;
        this.yaw += this.yawV * h;
        this.pitchV += (K * (0 - this.pitch) - C * this.pitchV) * h;
        this.pitch += this.pitchV * h;
      }
    }
    const tx = clamp(this.hover.x + this.gyro.x, -0.45, 0.45);
    const ty = clamp(this.hover.y + this.gyro.y, -0.5, 0.5);
    const a = 1 - Math.exp(-TILT_FOLLOW * dt);
    this.tilt.x += (tx - this.tilt.x) * a;
    this.tilt.y += (ty - this.tilt.y) * a;

    this.idleFor += dt;
    const idleTarget = !this.reduced && !this.dragging && this.idleFor > 1.5 ? 1 : 0;
    this.idleAmt += (idleTarget - this.idleAmt) * (1 - Math.exp(-1.2 * dt));
    const i = this.idleAmt;
    this.out.pitch = this.pitch + this.tilt.x + i * (0.07 * Math.sin(time * 0.61) + 0.03 * Math.sin(time * 1.37));
    this.out.yaw = this.yaw + this.tilt.y + i * (0.16 * Math.sin(time * 0.43) + 0.04 * Math.sin(time * 1.1));
    this.out.roll = i * 0.015 * Math.sin(time * 0.5);
    this.out.lift = i * 0.035 * Math.sin(time * 0.8);
    return this.out;
  }
}
