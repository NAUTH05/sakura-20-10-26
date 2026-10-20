/**
 * Procedural ambient soundtrack — no audio files.
 *
 * A slow pad drifting through four chords, sparse pentatonic bells and a
 * whisper of wind, all synthesised with the Web Audio API and sent through a
 * generated reverb impulse. Started on a user gesture (the Music button).
 */

const CHORDS = [
  [110.0, 164.81, 220.0, 261.63, 329.63], // Am9
  [87.31, 130.81, 174.61, 220.0, 261.63], // Fmaj7
  [65.41, 130.81, 196.0, 246.94, 329.63], // Cmaj7
  [98.0, 146.83, 196.0, 246.94, 293.66], // G6
]

const BELLS = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5]

class Ambient {
  constructor() {
    this.ctx = null
    this.master = null
    this.reverb = null
    this.padVoices = []
    this.chordIndex = 0
    this.chordTimer = null
    this.bellTimer = null
    this.playing = false
    this.ready = false
    this.volume = 0.62
  }

  build() {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return false

    const ctx = new Ctx()
    this.ctx = ctx

    const master = ctx.createGain()
    master.gain.value = 0.0001

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 24
    comp.ratio.value = 3
    comp.attack.value = 0.01
    comp.release.value = 0.4

    master.connect(comp)
    comp.connect(ctx.destination)
    this.master = master

    // generated reverb tail
    const len = Math.floor(ctx.sampleRate * 3.6)
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.7)
      }
    }
    const conv = ctx.createConvolver()
    conv.buffer = impulse
    const wet = ctx.createGain()
    wet.gain.value = 0.55
    conv.connect(wet)
    wet.connect(master)
    this.reverb = conv

    // pad
    const padBus = ctx.createGain()
    padBus.gain.value = 0.16
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1100
    filter.Q.value = 0.5
    padBus.connect(filter)
    filter.connect(master)
    filter.connect(conv)

    CHORDS[0].forEach((freq, i) => {
      const g = ctx.createGain()
      g.gain.value = 0.16 / (1 + i * 0.15)
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null
      if (pan) pan.pan.value = (i % 2 === 0 ? -1 : 1) * (0.15 + i * 0.1)

      const a = ctx.createOscillator()
      a.type = i < 2 ? 'sine' : 'triangle'
      a.frequency.value = freq
      a.detune.value = -5

      const b = ctx.createOscillator()
      b.type = 'sine'
      b.frequency.value = freq * 2
      b.detune.value = 6
      const bg = ctx.createGain()
      bg.gain.value = 0.22

      a.connect(g)
      b.connect(bg)
      bg.connect(g)
      if (pan) {
        g.connect(pan)
        pan.connect(padBus)
      } else {
        g.connect(padBus)
      }
      a.start()
      b.start()
      this.padVoices.push({ a, b, gain: g })
    })

    // slow filter movement
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.045
    lfoGain.gain.value = 380
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start()

    // wind bed
    const noiseLen = ctx.sampleRate * 4
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    noise.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 480
    bp.Q.value = 0.7
    const nGain = ctx.createGain()
    nGain.gain.value = 0.035
    noise.connect(bp)
    bp.connect(nGain)
    nGain.connect(master)
    noise.start()

    this.ready = true
    return true
  }

  scheduleBell() {
    if (!this.playing) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const freq = BELLS[Math.floor(Math.random() * BELLS.length)]
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(0.09, now + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.8)

    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    if (pan) pan.pan.value = Math.random() * 1.4 - 0.7

    osc.connect(g)
    if (pan) {
      g.connect(pan)
      pan.connect(this.reverb)
      pan.connect(this.master)
    } else {
      g.connect(this.reverb)
      g.connect(this.master)
    }
    osc.start(now)
    osc.stop(now + 3)

    this.bellTimer = setTimeout(() => this.scheduleBell(), 2200 + Math.random() * 4200)
  }

  advanceChord() {
    if (!this.playing || !this.ctx) return
    this.chordIndex = (this.chordIndex + 1) % CHORDS.length
    const chord = CHORDS[this.chordIndex]
    const now = this.ctx.currentTime
    this.padVoices.forEach((v, i) => {
      const f = chord[i % chord.length]
      v.a.frequency.exponentialRampToValueAtTime(f, now + 4.5)
      v.b.frequency.exponentialRampToValueAtTime(f * 2, now + 4.5)
    })
  }

  async start() {
    if (!this.ready && !this.build()) return false
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), now)
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.0002, this.volume), now + 2.4)

    this.playing = true
    clearInterval(this.chordTimer)
    this.chordTimer = setInterval(() => this.advanceChord(), 13000)
    clearTimeout(this.bellTimer)
    this.scheduleBell()
    return true
  }

  setVolume(v) {
    this.volume = Math.max(0.0001, Math.min(1, v))
    if (this.ctx && this.playing) {
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(this.volume, now, 0.15)
    }
  }

  stop() {
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + 1.6)
    this.playing = false
    clearInterval(this.chordTimer)
    clearTimeout(this.bellTimer)
  }

  dispose() {
    this.stop()
    if (this.ctx) this.ctx.close()
    this.ctx = null
    this.ready = false
  }
}

export const ambient = new Ambient()
