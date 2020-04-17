import { subscribeAndFeedWheelEvents } from '../helper/recordPhases'
import { PhaseData, WheelEventData } from '../../wheel-analyzer.types'
import { lastOf } from '../../utils/utils'

interface GenerateEventsProps {
  deltaTotal: number[]
  durationMs: number
  eventEveryMs?: number
  deltaMode?: number
}

function generateEvents({ deltaTotal, durationMs, eventEveryMs = 1000 / 60, deltaMode = 0 }: GenerateEventsProps) {
  const wheelEvents: WheelEventData[] = []
  const [deltaX, deltaY, deltaZ] = deltaTotal.map((d) => (d / durationMs) * eventEveryMs)

  let timeStamp = 0
  while (timeStamp < durationMs && Math.round(timeStamp + eventEveryMs) <= durationMs) {
    timeStamp += eventEveryMs

    wheelEvents.push({
      deltaX,
      deltaY,
      deltaZ,
      deltaMode,
      timeStamp,
    })
  }

  return { wheelEvents }
}

function calcAverageVelocity(phases: PhaseData[]) {
  return phases.reduce(
    (averageAcc, { axisVelocity }) => {
      averageAcc[0] = (averageAcc[0] + axisVelocity[0]) / 2
      averageAcc[1] = (averageAcc[1] + axisVelocity[1]) / 2
      return averageAcc
    },
    [0, 0]
  )
}

describe('velocity', () => {
  it('should have velocity in first (and only) event - x', () => {
    const { allPhaseData } = subscribeAndFeedWheelEvents({
      wheelEvents: [{ deltaX: 0, deltaY: 20, deltaMode: 0 }],
    })
    const [xVelo, yVelo] = allPhaseData[1].axisVelocity

    // velocity in first event is based on the initial timeout between two events
    expect(xVelo).toEqual(0)
    expect(yVelo).toEqual(20 / 400)
    expect(allPhaseData).toMatchSnapshot()
  })

  it('check average velocity', () => {
    const { allPhaseData } = subscribeAndFeedWheelEvents(generateEvents({ deltaTotal: [0, 500], durationMs: 1000 }))
    const averageVelocity = calcAverageVelocity(allPhaseData)

    expect(averageVelocity[0]).toBeCloseTo(0)
    expect(averageVelocity[1]).toBeCloseTo(0.5)
  })

  it('check average velocity - different total delta', () => {
    const { allPhaseData } = subscribeAndFeedWheelEvents(generateEvents({ deltaTotal: [0, 1000], durationMs: 1000 }))
    const averageVelocity = calcAverageVelocity(allPhaseData)

    expect(averageVelocity[0]).toBeCloseTo(0)
    expect(averageVelocity[1]).toBeCloseTo(1)
  })

  it('velocity & axisDeltas - different event rate', () => {
    const { allPhaseData } = subscribeAndFeedWheelEvents(
      generateEvents({ deltaTotal: [0, 1000], durationMs: 1000, eventEveryMs: 1000 / 30 })
    )
    const averageVelocity = calcAverageVelocity(allPhaseData)

    expect(averageVelocity[0]).toBeCloseTo(0)
    expect(averageVelocity[1]).toBeCloseTo(1)

    const [deltaX, deltaY] = lastOf(allPhaseData).axisDeltas

    expect(deltaX).toBeCloseTo(0)
    expect(deltaY).toBeCloseTo(1000)
  })

  it('velocity & axisDeltas - x & y axis', () => {
    const { allPhaseData } = subscribeAndFeedWheelEvents(
      generateEvents({ deltaTotal: [2000, 2000], durationMs: 1000, eventEveryMs: 1000 / 30 })
    )
    const averageVelocity = calcAverageVelocity(allPhaseData)

    expect(averageVelocity[0]).toBeCloseTo(2)
    expect(averageVelocity[1]).toBeCloseTo(2)

    const [deltaX, deltaY] = lastOf(allPhaseData).axisDeltas

    expect(deltaX).toBeCloseTo(2000)
    expect(deltaY).toBeCloseTo(2000)
  })
})