import FFT from './fft'

export default class AudioProcessor {
  numberOfSamples: number
  fftSize: number
  fft: any
  audioContext?: AudioContext
  audible: DelayNode | undefined
  analyser: AnalyserNode | undefined
  analyserL: AnalyserNode | undefined
  analyserR: AnalyserNode | undefined
  splitter: ChannelSplitterNode | undefined
  timeByteArray: Uint8Array<ArrayBuffer>
  timeByteArrayL: Uint8Array<ArrayBuffer>
  timeByteArrayR: Uint8Array<ArrayBuffer>
  timeArray: Int8Array
  timeByteArraySignedL: Int8Array
  timeByteArraySignedR: Int8Array
  tempTimeArrayL: Int8Array
  tempTimeArrayR: Int8Array
  timeArrayL: Int8Array
  timeArrayR: Int8Array
  freqArray: any
  freqArrayL: any
  freqArrayR: any

  constructor(context: AudioContext | null = null) {
    this.numberOfSamples = 512
    this.fftSize = this.numberOfSamples * 2

    this.fft = new FFT(this.fftSize, 512, true)

    if (context) {
      this.audioContext = context
      this.audible = context.createDelay()

      this.analyser = context.createAnalyser()
      this.analyser.smoothingTimeConstant = 0.0
      this.analyser.fftSize = this.fftSize

      this.audible.connect(this.analyser)

      // Split channels
      this.analyserL = context.createAnalyser()
      this.analyserL.smoothingTimeConstant = 0.0
      this.analyserL.fftSize = this.fftSize

      this.analyserR = context.createAnalyser()
      this.analyserR.smoothingTimeConstant = 0.0
      this.analyserR.fftSize = this.fftSize

      this.splitter = context.createChannelSplitter(2)

      this.audible.connect(this.splitter)
      this.splitter.connect(this.analyserL, 0)
      this.splitter.connect(this.analyserR, 1)
    }

    // Initialised once as typed arrays
    // Used for webaudio API raw (time domain) samples. 0 -> 255
    this.timeByteArray = new Uint8Array(this.fftSize)
    this.timeByteArrayL = new Uint8Array(this.fftSize)
    this.timeByteArrayR = new Uint8Array(this.fftSize)

    // Signed raw samples shifted to -128 -> 127
    this.timeArray = new Int8Array(this.fftSize)
    this.timeByteArraySignedL = new Int8Array(this.fftSize)
    this.timeByteArraySignedR = new Int8Array(this.fftSize)

    // Temporary array for smoothing
    this.tempTimeArrayL = new Int8Array(this.fftSize)
    this.tempTimeArrayR = new Int8Array(this.fftSize)

    // Undersampled from this.fftSize to this.numberOfSamples
    this.timeArrayL = new Int8Array(this.numberOfSamples)
    this.timeArrayR = new Int8Array(this.numberOfSamples)
  }

  sampleAudio() {
    if (!this.analyser || !this.analyserL || !this.analyserR) {
      return
    }
    this.analyser.getByteTimeDomainData(this.timeByteArray)
    this.analyserL.getByteTimeDomainData(this.timeByteArrayL)
    this.analyserR.getByteTimeDomainData(this.timeByteArrayR)
    this.processAudio()
  }

  updateAudio(timeByteArray: Uint8Array<ArrayBuffer>, timeByteArrayL: Uint8Array<ArrayBuffer>, timeByteArrayR: Uint8Array<ArrayBuffer>) {
    this.timeByteArray.set(timeByteArray)
    this.timeByteArrayL.set(timeByteArrayL)
    this.timeByteArrayR.set(timeByteArrayR)
    this.processAudio()
  }

  processAudio() {
    for (let i = 0, j = 0, lastIdx = 0; i < this.fftSize; i++) {
      // Shift Unsigned to Signed about 0
      this.timeArray[i] = this.timeByteArray[i] - 128
      this.timeByteArraySignedL[i] = this.timeByteArrayL[i] - 128
      this.timeByteArraySignedR[i] = this.timeByteArrayR[i] - 128

      this.tempTimeArrayL[i]
        = 0.5
          * (this.timeByteArraySignedL[i] + this.timeByteArraySignedL[lastIdx])
      this.tempTimeArrayR[i]
        = 0.5
          * (this.timeByteArraySignedR[i] + this.timeByteArraySignedR[lastIdx])

      // Undersampled
      if (i % 2 === 0) {
        this.timeArrayL[j] = this.tempTimeArrayL[i]
        this.timeArrayR[j] = this.tempTimeArrayR[i]
        j += 1
      }

      lastIdx = i
    }

    // Use full width samples for the FFT
    this.freqArray = this.fft.timeToFrequencyDomain(this.timeArray)
    this.freqArrayL = this.fft.timeToFrequencyDomain(this.timeByteArraySignedL)
    this.freqArrayR = this.fft.timeToFrequencyDomain(this.timeByteArraySignedR)
  }

  connectAudio(audionode) {
    audionode.connect(this.audible)
  }

  disconnectAudio(audionode) {
    audionode.disconnect(this.audible)
  }
}
