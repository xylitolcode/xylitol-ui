import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import type { GhostTrace } from '../components/GhostPath/trace'

import { createRecorder, findRecorderNode, type Recorder } from './recorder'

export interface PointerTrace {
  start: () => void
  /** Drop a pause at the current position, then keep moving. */
  mark: (hold?: number) => void
  /** Stop and hand back the trace. Pass the step labels that match the pauses. */
  stop: (steps?: string[]) => GhostTrace | null
  recording: boolean
  marks: number
}

/**
 * Development-only recorder. Wire it to the same element you later play with
 * `GhostPath`, move the pointer over the text by hand, mark the holds, then
 * paste the JSON it returns into the repo.
 */
export function usePointerTrace(target: RefObject<Element | null>): PointerTrace {
  const recorderRef = useRef<Recorder | null>(null)
  const detachRef = useRef<(() => void) | null>(null)
  const [recording, setRecording] = useState(false)
  const [marks, setMarks] = useState(0)

  const stop = useCallback((steps: string[] = []) => {
    detachRef.current?.()
    detachRef.current = null
    const recorder = recorderRef.current
    recorderRef.current = null
    setRecording(false)
    return recorder ? recorder.finish(steps) : null
  }, [])

  useEffect(() => () => detachRef.current?.(), [])

  const start = useCallback(() => {
    const element = target.current
    if (!element) return

    const node = findRecorderNode(element)
    if (!node) return

    detachRef.current?.()

    const recorder = createRecorder(node)
    recorderRef.current = recorder
    setMarks(0)

    const onMove = (event: PointerEvent) => recorder.sample(event, 'move')
    const onDown = (event: PointerEvent) => recorder.sample(event, 'click')

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)
    detachRef.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
    }

    setRecording(true)
  }, [target])

  const mark = useCallback((hold = 620) => {
    const recorder = recorderRef.current
    if (!recorder) return
    recorder.mark(hold)
    setMarks((value) => value + 1)
  }, [])

  return { start, mark, stop, recording, marks }
}
