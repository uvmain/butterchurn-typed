function isSupported(): boolean {
  const canvas = document.createElement('canvas')
  let gl: WebGL2RenderingContext | null
  try {
    gl = canvas.getContext('webgl2')
  }
  catch (err) {
    console.error('Error occurred while creating WebGL2 context:', err)
    gl = null
  }

  const webGL2Supported = (gl !== null)
  const audioApiSupported = !!(
    (window as any).AudioContext || (window as any).webkitAudioContext
  )

  return webGL2Supported && audioApiSupported
}

export default isSupported
