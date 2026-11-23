// All cues are synthesized locally. Call unlock from a player gesture.
export function createAudio() {
  let enabled = false;
  let context;
  let output;
  let noise;
  let resuming;

  function setEnabled(value) {
    enabled = Boolean(value);
    if (output)
      output.gain.setTargetAtTime(
        enabled ? 0.19 : 0,
        context.currentTime,
        0.006,
      );
  }

  function unlock() {
    if (
      !enabled ||
      globalThis.navigator?.userActivation?.hasBeenActive === false
    )
      return;
    const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!context) {
        context = new Audio();
        output = context.createGain();
        output.gain.value = 0.19;
        output.connect(context.destination);
      }
      if (context.state !== "running" && !resuming) {
        resuming = context
          .resume()
          .catch(() => {})
          .finally(() => {
            resuming = undefined;
          });
      }
      return resuming;
    } catch {
      // Games remain playable in browsers with audio disabled.
      return;
    }
  }

  function envelope(start, duration, volume) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(output);
    return gain;
  }

  function tone(start, fromHz, toHz, duration, volume, wave = "sine") {
    const source = context.createOscillator();
    source.type = wave;
    source.frequency.setValueAtTime(fromHz, start);
    source.frequency.exponentialRampToValueAtTime(toHz, start + duration);
    const gain = envelope(start, duration, volume);
    source.connect(gain);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(start);
    source.stop(start + duration);
  }

  function splash(start) {
    if (!noise) {
      noise = context.createBuffer(
        1,
        Math.ceil(context.sampleRate * 0.13),
        context.sampleRate,
      );
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++)
        samples[i] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = envelope(start, 0.12, 0.22);
    source.buffer = noise;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(920, start);
    filter.frequency.exponentialRampToValueAtTime(240, start + 0.12);
    source.connect(filter);
    filter.connect(gain);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(start);
  }

  function play(cue, tier = 0) {
    if (!enabled || !context) return;
    if (context.state !== "running") {
      if (resuming) {
        const requested = Date.now();
        resuming.then(() => {
          if (context.state === "running" && Date.now() - requested < 250)
            play(cue, tier);
        });
      }
      return;
    }
    const start = context.currentTime + 0.005;
    switch (cue) {
      case "launch":
        splash(start);
        tone(start + 0.035, 590, 180, 0.2, 0.33);
        tone(start + 0.18, 210, 92, 0.15, 0.18, "triangle");
        break;
      case "tick":
        tone(start, 780, 530, 0.035, 0.18, "triangle");
        break;
      case "miss":
        tone(start, 195, 145, 0.11, 0.28, "triangle");
        tone(start + 0.11, 147, 92, 0.16, 0.25, "triangle");
        break;
      case "echo":
        tone(start, 860, 845, 0.15, 0.4);
        tone(start + 0.13, 855, 845, 0.19, 0.12);
        break;
      case "score": {
        const level = Math.max(0, Math.min(5, Math.trunc(Number(tier)) || 0));
        const notes = [1, 1.25, 1.5, 2];
        const count = level === 5 ? 4 : 2 + Number(level >= 3);
        const root = 240 * 2 ** (level / 9);
        notes.slice(0, count).forEach((ratio, index) => {
          tone(
            start + index * 0.075,
            root * ratio,
            root * ratio,
            0.21,
            0.32,
            "triangle",
          );
        });
        break;
      }
      case "surface":
        tone(start, 170, 390, 0.23, 0.3);
        tone(start + 0.13, 300, 590, 0.19, 0.28);
        splash(start + 0.27);
        break;
    }
  }

  return { setEnabled, unlock, play };
}
