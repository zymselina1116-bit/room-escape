import React, { useMemo } from 'react'
import * as THREE from 'three'
import Portal from '../Portal'

export default function HallwayScene({ onPortalEnter, camera, isTransitioning }) {
  // Create repeating arcade arches with instancing
  const arches = useMemo(() => {
    const archArray = []
    const archCount = 30
    const archSpacing = 8

    for (let i = 0; i < archCount; i++) {
      const z = -i * archSpacing
      const distanceFactor = Math.min(i / 15, 1)

      // Warmth decreases with distance
      const lightIntensity = 0.5 * (1 - distanceFactor * 0.7)
      const lightColor = new THREE.Color().lerpColors(
        new THREE.Color(0xffd7a3),
        new THREE.Color(0xccb8a3),
        distanceFactor
      )

      archArray.push(
        <group key={i} position={[0, 0, z]}>
          {/* Stone arch */}
          <mesh position={[0, 4, 0]} castShadow receiveShadow>
            <torusGeometry args={[3, 0.4, 16, 32, Math.PI]} />
            <meshStandardMaterial color={0xb8a89a} roughness={0.7} metalness={0.2} />
          </mesh>

          {/* Left pillar */}
          <mesh position={[-3, 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 4, 0.8]} />
            <meshStandardMaterial color={0xb8a89a} roughness={0.7} metalness={0.2} />
          </mesh>

          {/* Right pillar */}
          <mesh position={[3, 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 4, 0.8]} />
            <meshStandardMaterial color={0xb8a89a} roughness={0.7} metalness={0.2} />
          </mesh>

          {/* Wall lamps */}
          {/* Left lamp */}
          <group position={[-4, 3, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.3, 0.5, 0.2]} />
              <meshStandardMaterial color={0x8b7355} roughness={0.6} metalness={0.3} />
            </mesh>
            <pointLight
              position={[0, 0, 0.3]}
              intensity={lightIntensity}
              color={lightColor}
              distance={12}
              castShadow={i < 5}
            />
            {i < 10 && (
              <mesh position={[0, 0, 0.3]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={lightColor} />
              </mesh>
            )}
          </group>

          {/* Right lamp */}
          <group position={[4, 3, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.3, 0.5, 0.2]} />
              <meshStandardMaterial color={0x8b7355} roughness={0.6} metalness={0.3} />
            </mesh>
            <pointLight
              position={[0, 0, 0.3]}
              intensity={lightIntensity}
              color={lightColor}
              distance={12}
              castShadow={i < 5}
            />
            {i < 10 && (
              <mesh position={[0, 0, 0.3]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color={lightColor} />
              </mesh>
            )}
          </group>
        </group>
      )
    }

    return archArray
  }, [])

  return (
    <>
      {/* Fog - cuts off to imply infinity */}
      <fogExp2 attach="fog" args={[0x9b8b7a, 0.018]} />

      {/* Lighting */}
      <ambientLight intensity={0.3} color={0xffeedd} />

      <directionalLight
        position={[0, 10, 5]}
        intensity={0.4}
        color={0xffd7a3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Glossy stone floor */}
      <mesh position={[0, 0, -120]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 250]} />
        <meshStandardMaterial color={0x8b7d6b} roughness={0.2} metalness={0.4} />
      </mesh>

      {/* Walls */}
      <mesh position={[-5, 4, -120]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[250, 8]} />
        <meshStandardMaterial color={0xb8a89a} roughness={0.7} metalness={0.2} />
      </mesh>

      <mesh position={[5, 4, -120]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[250, 8]} />
        <meshStandardMaterial color={0xb8a89a} roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Vaulted ceiling */}
      <mesh position={[0, 7, -120]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 250]} />
        <meshStandardMaterial color={0xa89888} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Repeating arches */}
      {arches}

      {/* Return portal - large arched door at start */}
      <Portal
        type="return-door"
        geometry="door"
        position={[0, 1.25, 5]}
        rotation={[0, 0, 0]}
        destination="origin"
        onEnter={onPortalEnter}
        camera={camera}
        isTransitioning={isTransitioning}
      />
    </>
  )
}
