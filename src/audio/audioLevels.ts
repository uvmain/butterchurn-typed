import type AudioProcessor from './audioProcessor'
import { clamp } from '../utils/math'

export default class AudioLevels {
  audio: AudioProcessor
  starts: number[]
  stops: number[]
  val: Float32Array
  imm: Float32Array
  att: Float32Array
  avg: Float32Array
  longAvg: Float32Array

  constructor(audio: AudioProcessor) {
    this.audio = audio

    let sampleRate
    if (this.audio.audioContext) {
      sampleRate = this.audio.audioContext.sampleRate
    }
    else {
      sampleRate = 44100
    }

    const bucketHz = sampleRate / this.audio.fftSize

    const bassLow = clamp(
      Math.round(20 / bucketHz) - 1,
      0,
      this.audio.numberOfSamples - 1,
    )
    const bassHigh = clamp(
      Math.round(320 / bucketHz) - 1,
      0,
      this.audio.numberOfSamples - 1,
    )
    const midHigh = clamp(
      Math.round(2800 / bucketHz) - 1,
      0,
      this.audio.numberOfSamples - 1,
    )
    const trebHigh = clamp(
      Math.round(11025 / bucketHz) - 1,
      0,
      this.audio.numberOfSamples - 1,
    )

    this.starts = [bassLow, bassHigh, midHigh]
    this.stops = [bassHigh, midHigh, trebHigh]

    this.val = new Float32Array(3)
    this.imm = new Float32Array(3)
    this.att = new Float32Array(3)
    this.avg = new Float32Array(3)
    this.longAvg = new Float32Array(3)

    this.att.fill(1)
    this.avg.fill(1)
    this.longAvg.fill(1)
  }

  get bass(): number {
    return this.val[0]
  }

  get bass_att(): number {
    return this.att[0]
  }

  get mid(): number {
    return this.val[1]
  }

  get mid_att(): number {
    return this.att[1]
  }

  get treb(): number {
    return this.val[2]
  }

  get treb_att(): number {
    return this.att[2]
  }

  static isFiniteNumber(num): boolean {
    return Number.isFinite(num) && !Number.isNaN(num)
  }

  static adjustRateToFPS(rate: number, baseFPS: number, FPS: number): number {
    return rate ** (baseFPS / FPS)
  }

  updateAudioLevels(fps: number, frame: number) {
    if (this.audio.freqArray.length > 0) {
      let effectiveFPS = fps
      if (!AudioLevels.isFiniteNumber(effectiveFPS) || effectiveFPS < 15) {
        effectiveFPS = 15
      }
      else if (effectiveFPS > 144) {
        effectiveFPS = 144
      }

      // Clear for next loop
      this.imm.fill(0)
      for (let i = 0; i < 3; i++) {
        for (let j = this.starts[i]; j < this.stops[i]; j++) {
          this.imm[i] += this.audio.freqArray[j]
        }
      }

      for (let i = 0; i < 3; i++) {
        let rate
        if (this.imm[i] > this.avg[i]) {
          rate = 0.2
        }
        else {
          rate = 0.5
        }
        rate = AudioLevels.adjustRateToFPS(rate, 30.0, effectiveFPS)
        this.avg[i] = this.avg[i] * rate + this.imm[i] * (1 - rate)

        if (frame < 50) {
          rate = 0.9
        }
        else {
          rate = 0.992
        }
        rate = AudioLevels.adjustRateToFPS(rate, 30.0, effectiveFPS)
        this.longAvg[i] = this.longAvg[i] * rate + this.imm[i] * (1 - rate)

        if (this.longAvg[i] < 0.001) {
          this.val[i] = 1.0
          this.att[i] = 1.0
        }
        else {
          this.val[i] = this.imm[i] / this.longAvg[i]
          this.att[i] = this.avg[i] / this.longAvg[i]
        }
      }
    }
  }
}
