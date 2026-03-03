import { SeededRandom } from './seededRandom'

let globalRNG: RNGContext | null = null
let originalRand: ((x: number) => number) | null = null
let originalRandint: ((x: number) => number) | null = null
let originalMathRandom: (() => number) | null = null

export interface VisualiserOptions {
  deterministic?: boolean
  testMode?: boolean
  seed?: number
  width?: number
  height?: number
  onlyUseWASM?: boolean
  meshWidth?: number
  meshHeight?: number
  pixelRatio?: number
  textureRatio?: number
  outputFXAA?: boolean
}

export interface RNGContext {
  random: () => number
  rand: (x: number) => number
  randint: (x: number) => number
  getRNG: () => SeededRandom | null
  reset: (newSeed?: number) => void
}

export function initializeRNG(opts: VisualiserOptions = {}): RNGContext {
  if (opts.deterministic || opts.testMode) {
    globalRNG = createRNGContext(opts.seed || 12345)
  }
  else {
    globalRNG = createDefaultRNGContext()
  }

  if (opts.deterministic || opts.testMode) {
    if (!originalRand && (window as any).rand) {
      originalRand = (window as any).rand
      originalRandint = (window as any).randint
    }

    if (!originalMathRandom) {
      originalMathRandom = Math.random
    }

    // Override globals with our RNG
    const anyWindow = window as any
    anyWindow.rand = (x: number) => (globalRNG as RNGContext).rand(x)
    anyWindow.randint = (x: number) => (globalRNG as RNGContext).randint(x)
    Math.random = () => (globalRNG as RNGContext).random()
  }

  return globalRNG
}

export function getRNG(): RNGContext {
  if (!globalRNG) {
    globalRNG = createDefaultRNGContext()
  }
  return globalRNG
}

export function cleanup() {
  if (originalRand) {
    const anyWindow = window as any
    anyWindow.rand = originalRand
    anyWindow.randint = originalRandint
    originalRand = null
    originalRandint = null
  }

  if (originalMathRandom) {
    Math.random = originalMathRandom
    originalMathRandom = null
  }

  globalRNG = null
}

export function createRNGContext(seed = 1): RNGContext {
  const rng = new SeededRandom(seed)

  return {
    random: () => rng.next(),
    rand: x => rng.rand(x),
    randint: x => Math.floor(rng.rand(x) + 1),
    getRNG: () => rng,
    reset: (newSeed) => {
      if (newSeed !== undefined) {
        rng.reset(newSeed)
      }
      else {
        rng.reset(seed)
      }
    },
  }
}

export function createDefaultRNGContext(): RNGContext {
  return {
    random: Math.random,
    rand: x => x < 1 ? Math.random() : Math.random() * Math.floor(x),
    randint: x => Math.floor((x < 1 ? Math.random() : Math.random() * Math.floor(x)) + 1),
    getRNG: () => null,
    reset: () => { },
  }
}
