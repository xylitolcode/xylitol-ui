import { useEffect, useRef } from 'react'

export interface BoxRect {
  x: number
  y: number
  width: number
  height: number
}

const STIFFNESS = 420
const MASS = 0.6
const MAX_STEP = 1 / 30
const REST_DISTANCE = 0.02
const REST_SPEED = 0.02

interface Velocity {
  x: number
  y: number
  width: number
  height: number
}

const CHANNELS = ['x', 'y', 'width', 'height'] as const

/**
 * Drives an absolutely positioned element between boxes with a physically
 * accurate spring, writing straight to the DOM so no frames are dropped
 * through React state. The first box of a hover snaps into place; later boxes
 * glide, which is what makes the frame travel from word to word.
 */
export function useSpringRect(bounce: number, immediate: boolean) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const targetRef = useRef<BoxRect | null>(null)
  const currentRef = useRef<BoxRect | null>(null)
  const velocityRef = useRef<Velocity>({ x: 0, y: 0, width: 0, height: 0 })
  const frameRef = useRef(0)
  const timeRef = useRef(0)

  const paint = () => {
    const element = elementRef.current
    const current = currentRef.current
    if (!element || !current) return

    element.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)`
    element.style.width = `${current.width.toFixed(2)}px`
    element.style.height = `${current.height.toFixed(2)}px`
  }

  const stop = () => {
    if (frameRef.current !== 0) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    }
  }

  const tick = (now: number) => {
    const target = targetRef.current
    const current = currentRef.current
    if (!target || !current) {
      frameRef.current = 0
      return
    }

    const step = Math.min(Math.max((now - timeRef.current) / 1000, 0.001), MAX_STEP)
    timeRef.current = now

    const damping = 2 * Math.sqrt(STIFFNESS * MASS) * (1 - bounce)
    const velocity = velocityRef.current
    let moving = false

    for (const channel of CHANNELS) {
      const offset = current[channel] - target[channel]
      velocity[channel] += ((-STIFFNESS * offset - damping * velocity[channel]) / MASS) * step
      current[channel] += velocity[channel] * step

      if (
        Math.abs(target[channel] - current[channel]) > REST_DISTANCE ||
        Math.abs(velocity[channel]) > REST_SPEED
      ) {
        moving = true
      } else {
        current[channel] = target[channel]
        velocity[channel] = 0
      }
    }

    paint()
    frameRef.current = moving ? requestAnimationFrame(tick) : 0
  }

  const moveTo = (rect: BoxRect | null) => {
    stop()
    targetRef.current = rect
    if (!rect) return

    if (!currentRef.current || immediate) {
      currentRef.current = { ...rect }
      velocityRef.current = { x: 0, y: 0, width: 0, height: 0 }
      paint()
      return
    }

    timeRef.current = performance.now()
    frameRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => stop, [])

  return { ref: elementRef, moveTo }
}
