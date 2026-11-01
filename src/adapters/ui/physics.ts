interface SpringOptions {
  from: number
  to: number
  velocity: number
  response: number
  onFrame: (value: number, velocity: number) => void
  onDone?: () => void
}

// Critically damped spring. Response is measured in seconds; the returned function stops it.
export function spring({ from, to, velocity, response, onFrame, onDone }: SpringOptions): () => void {
  const frequency = (2 * Math.PI) / response
  const displacement = from - to
  const coefficient = velocity + frequency * displacement
  let start: number | undefined
  let frame = 0

  const tick = (now: number) => {
    start ??= now
    const elapsed = (now - start) / 1000
    const decay = Math.exp(-frequency * elapsed)
    const offset = (displacement + coefficient * elapsed) * decay
    const speed = (velocity - frequency * coefficient * elapsed) * decay
    if (Math.abs(offset) < 0.3 && Math.abs(speed) < 10) {
      onFrame(to, 0)
      onDone?.()
      return
    }
    onFrame(to + offset, speed)
    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

// Project a flick using the deceleration rate used by iOS scroll views.
export const project = (velocity: number, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate)

// Reduce the distance beyond an edge as the overshoot grows.
export const rubberband = (overshoot: number, dimension: number, resistance = 0.55) =>
  (overshoot * dimension * resistance) / (dimension + resistance * Math.abs(overshoot))

// Velocity in pixels per second from recent samples.
export class VelocityTracker {
  private samples: { position: number; time: number }[] = []

  add(position: number, time: number) {
    this.samples.push({ position, time })
    while (this.samples.length > 2 && time - this.samples[0].time > 100) this.samples.shift()
  }

  get(): number {
    const first = this.samples[0]
    const last = this.samples[this.samples.length - 1]
    if (!first || !last || last.time === first.time) return 0
    return ((last.position - first.position) / (last.time - first.time)) * 1000
  }
}
