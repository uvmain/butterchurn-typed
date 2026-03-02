import type { RNGContext } from './seededRandom'
import { createDefaultRNGContext, createRNGContext } from './seededRandom'

let globalRNG: RNGContext | null = null
let originalRand: ((x: number) => number) | null = null
let originalRandint: ((x: number) => number) | null = null
let originalMathRandom: (() => number) | null = null

interface RNGOptions {
  deterministic?: boolean
  testMode?: boolean
  seed?: number
}

export function initializeRNG(opts: RNGOptions = {}) {
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

export function getRNG() {
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
