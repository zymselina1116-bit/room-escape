import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Portal from '../Portal'

export default function OriginRoom({ onPortalEnter, camera, isTransitioning, variation }) {
  const clockRef = useRef()
  const sunLightRef = useRef()

  useFrame(({ clock }) => {
    // Subtle clock ticking with tempo variation
    if (clockRef.current) {
      const time = clock.elapsedTime * variation.clockTempo
      const tickRotation = Math.sin(time * 2) * 0.1
      clockRef.current.rotation.z = tickRotation
    }

    // Apply light angle variation
    if (sunLightRef.current) {
      const baseAngle = Math.PI / 4
      sunLightRef.current.position.set(
        Math.sin(baseAngle + variation.lightAngle) * 10,
        8,
        Math.cos(baseAngle + variation.lightAngle) * 10
      )
    }
  })

  return (
    <>
      {/* Fog */}
      <fogExp2 attach="fog" args={[0xf5e6d3, 0.008]} />

      {/* Lighting */}
      <ambientLight intensity={0.5} color={0xfff8e7} />

      <directionalLight
        ref={sunLightRef}
        position={[5, 8, 5]}
        intensity={1.0}
        color={0xfff4d6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <pointLight position={[-3, 3, 0]} intensity={0.4} color={0xffe4b5} distance={20} />
      <pointLight position={[3, 2, -3]} intensity={0.3} color={0xffd7a3} distance={15} />

      {/* Room Structure - 16×9×16 units with high ceiling */}
      <group>
        {/* Floor - Polished wood */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[16, 16]} />
          <meshStandardMaterial color={0xd4b896} roughness={0.3} metalness={0.2} />
        </mesh>

        {/* Ceiling */}
        <mesh position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[16, 16]} />
          <meshStandardMaterial color={0xf5e6d3} roughness={0.8} metalness={0.1} />
        </mesh>

        {/* North Wall (with door portal) */}
        <mesh position={[0, 4.5, -8]} receiveShadow>
          <planeGeometry args={[16, 9]} />
          <meshStandardMaterial color={0xf5e6d3} roughness={0.8} metalness={0.1} />
        </mesh>

        {/* South Wall */}
        <mesh position={[0, 4.5, 8]} rotation={[0, Math.PI, 0]} receiveShadow>
          <planeGeometry args={[16, 9]} />
          <meshStandardMaterial color={0xf5e6d3} roughness={0.8} metalness={0.1} />
        </mesh>

        {/* East Wall (with glass door portal) */}
        <mesh position={[8, 4.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[16, 9]} />
          <meshStandardMaterial color={0xf5e6d3} roughness={0.8} metalness={0.1} />
        </mesh>

        {/* West Wall (with window portal) */}
        <mesh position={[-8, 4.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[16, 9]} />
          <meshStandardMaterial color={0xf5e6d3} roughness={0.8} metalness={0.1} />
        </mesh>
      </group>

      {/* Portals - Three permanent, re-enterable portals */}

      {/* 1. Large arched wooden door (North wall) → Hallway */}
      <Portal
        type="hallway-door"
        geometry="door"
        position={[0, 1.25, -7.9]}
        destination="hallway"
        onEnter={onPortalEnter}
        camera={camera}
        isTransitioning={isTransitioning}
      />

      {/* 2. Tall glass door (East wall) → Pool */}
      <Portal
        type="glass-door"
        geometry="glass-door"
        position={[7.9, 1.25, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        destination="pool"
        onEnter={onPortalEnter}
        camera={camera}
        isTransitioning={isTransitioning}
      />

      {/* 3. Tall window (West wall) → Garden */}
      <Portal
        type="window"
        geometry="window"
        position={[-7.9, 1.25, 0]}
        rotation={[0, Math.PI / 2, 0]}
        destination="garden"
        onEnter={onPortalEnter}
        camera={camera}
        isTransitioning={isTransitioning}
      />

      {/* Decorative elements */}
      {/* Simple table in center */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[2, 0.1, 1]} />
          <meshStandardMaterial color={0x8b6f47} roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Table legs */}
        {[-0.9, 0.9].map((x) =>
          [-0.4, 0.4].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.4, z]} castShadow>
              <boxGeometry args={[0.1, 0.8, 0.1]} />
              <meshStandardMaterial color={0x8b6f47} roughness={0.6} metalness={0.1} />
            </mesh>
          ))
        )}
      </group>

      {/* Wall clock (subtle, shows variation) */}
      <group ref={clockRef} position={[0, 5, -7.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
          <meshStandardMaterial color={0x8b7355} roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Clock hands */}
        <mesh position={[0, 0, 0.03]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.02, 0.2, 0.01]} />
          <meshStandardMaterial color={0x000000} />
        </mesh>
      </group>

      {/* Volumetric light rays effect (simple) */}
      <mesh position={[5, 6, 5]} rotation={[-Math.PI / 4, 0, 0]}>
        <coneGeometry args={[3, 8, 4, 1, true]} />
        <meshBasicMaterial
          color={0xffffff}
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}
