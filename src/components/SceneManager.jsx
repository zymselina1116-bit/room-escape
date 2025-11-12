import React, { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import OriginRoom from './scenes/OriginRoom'
import PoolScene from './scenes/PoolScene'
import GardenScene from './scenes/GardenScene'
import HallwayScene from './scenes/HallwayScene'

export default function SceneManager({
  currentScene,
  setCurrentScene,
  isTransitioning,
  setIsTransitioning
}) {
  const { camera } = useThree()
  const originVariation = useRef({ lightAngle: 0, clockTempo: 1.0 })

  const handlePortalEnter = (destination) => {
    if (isTransitioning) return

    setIsTransitioning(true)

    // Transition effect
    const transitionDuration = 800

    // Exposure flash (handled by PostProcessing)
    setTimeout(() => {
      if (destination === 'origin') {
        // Return to origin: reset position and apply subtle variation
        camera.position.set(0, 1.6, 0)
        camera.rotation.set(0, 0, 0)

        // Apply tiny variation to suggest loop
        originVariation.current.lightAngle += (Math.random() - 0.5) * 6 * (Math.PI / 180)
        originVariation.current.clockTempo += (Math.random() - 0.5) * 0.04
        originVariation.current.clockTempo = Math.max(0.96, Math.min(1.04, originVariation.current.clockTempo))
      }

      setCurrentScene(destination)

      setTimeout(() => {
        setIsTransitioning(false)
      }, 200)
    }, transitionDuration / 2)
  }

  return (
    <group>
      {currentScene === 'origin' && (
        <OriginRoom
          onPortalEnter={handlePortalEnter}
          camera={camera}
          isTransitioning={isTransitioning}
          variation={originVariation.current}
        />
      )}
      {currentScene === 'pool' && (
        <PoolScene onPortalEnter={handlePortalEnter} camera={camera} isTransitioning={isTransitioning} />
      )}
      {currentScene === 'garden' && (
        <GardenScene onPortalEnter={handlePortalEnter} camera={camera} isTransitioning={isTransitioning} />
      )}
      {currentScene === 'hallway' && (
        <HallwayScene onPortalEnter={handlePortalEnter} camera={camera} isTransitioning={isTransitioning} />
      )}
    </group>
  )
}
