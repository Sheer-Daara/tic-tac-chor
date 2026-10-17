/**
 * Procedural, royalty-free move sounds.
 *
 * The two cues are synthesised from scratch here (no sampled or downloaded
 * material), so the bundled WAVs carry no third-party licensing. Rendering is
 * deterministic: regenerating produces byte-identical files, which lets the
 * checked-in assets be verified in CI via `check-sounds.mjs`.
 *
 * Character:
 * - `player-move` is a bright, rising two-note blip (E5 → B5) for the human.
 * - `computer-move` is a lower, woodier falling two-note "tok" (B3 → F#3).
 */

const SAMPLE_RATE = 44_100;

/** Keep every cue short and small enough to bundle and precache cheaply. */
export const MOVE_SOUNDS = [
  {
    id: "player-move",
    file: "move-player.wav",
    description: "A bright, rising two-note chime for the human player's move.",
  },
  {
    id: "computer-move",
    file: "move-computer.wav",
    description: "A lower, rounded two-note knock for the computer's move.",
  },
];

/**
 * Mix one decaying harmonic tone into the buffer.
 * @param {Float64Array} samples
 * @param {{ start: number; frequency: number; duration: number; tau: number; gain: number; harmonics: readonly number[]; detune?: number }} note
 */
function addNote(samples, note) {
  const { start, frequency, duration, tau, gain, harmonics, detune = 0 } = note;
  const startIndex = Math.floor(start * SAMPLE_RATE);
  const endIndex = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  const attack = 0.004;
  for (let index = startIndex; index < endIndex; index += 1) {
    const time = index / SAMPLE_RATE - start;
    if (time < 0) continue;
    const attackGain = time < attack ? time / attack : 1;
    const decay = Math.exp(-time / tau);
    let value = 0;
    for (let harmonic = 0; harmonic < harmonics.length; harmonic += 1) {
      const ratio = harmonic + 1 + detune * harmonic;
      value += harmonics[harmonic] * Math.sin(2 * Math.PI * frequency * ratio * time);
    }
    samples[index] += value * attackGain * decay * gain;
  }
}

function renderPlayerMove() {
  const duration = 0.2;
  const samples = new Float64Array(Math.ceil(duration * SAMPLE_RATE));
  // Bright marimba-ish timbre: strong fundamental with a light upper sparkle.
  const harmonics = [1, 0.32, 0.14, 0.05];
  addNote(samples, {
    start: 0,
    frequency: 659.25, // E5
    duration: 0.1,
    tau: 0.045,
    gain: 0.85,
    harmonics,
  });
  addNote(samples, {
    start: 0.062,
    frequency: 987.77, // B5
    duration: 0.14,
    tau: 0.055,
    gain: 0.7,
    harmonics,
  });
  return samples;
}

function renderComputerMove() {
  const duration = 0.26;
  const samples = new Float64Array(Math.ceil(duration * SAMPLE_RATE));
  // Rounder, slightly hollow timbre: fewer high partials, gentle detune.
  const harmonics = [1, 0.22, 0.05];
  addNote(samples, {
    start: 0,
    frequency: 246.94, // B3
    duration: 0.12,
    tau: 0.06,
    gain: 0.9,
    harmonics,
    detune: 0.002,
  });
  addNote(samples, {
    start: 0.078,
    frequency: 185.0, // F#3
    duration: 0.18,
    tau: 0.08,
    gain: 0.75,
    harmonics,
    detune: 0.002,
  });
  return samples;
}

/** Fade the tail and normalise to a consistent, click-free peak. */
function finish(samples) {
  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0) || 1;
  const target = 0.82;
  const fadeSamples = Math.floor(0.006 * SAMPLE_RATE);
  const total = samples.length;
  for (let index = 0; index < total; index += 1) {
    const remaining = total - index;
    const fade = remaining < fadeSamples ? remaining / fadeSamples : 1;
    samples[index] = Math.max(-1, Math.min(1, (samples[index] / peak) * target * fade));
  }
  return samples;
}

/** Encode mono float samples as a 16-bit PCM WAV buffer. */
function encodeWav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(clamped * 32_767), 44 + index * 2);
  }
  return buffer;
}

const renderers = {
  "player-move": renderPlayerMove,
  "computer-move": renderComputerMove,
};

/** @param {string} id */
export function renderMoveSound(id) {
  const render = renderers[id];
  if (!render) throw new Error(`Unknown move sound: ${id}`);
  return encodeWav(finish(render()));
}

export function renderAllMoveSounds() {
  return MOVE_SOUNDS.map(({ id, file }) => ({ id, file, bytes: renderMoveSound(id) }));
}
