import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Portal from '../Portal'

export default function GardenScene({ onPortalEnter, camera, isTransitioning }) {
  const dustMotesRef = useRef()
  const plantsRef = useRef([])

  useFrame(({ clock }) => {
    // Animate dust motes
    if (dustMotesRef.current) {
      dustMotesRef.current.children.forEach((mote, i) => {
        const time = clock.elapsedTime + i
        mote.position.y += Math.sin(time) * 0.002
        mote.position.x += Math.cos(time * 0.7) * 0.001
      })
    }

    // Gentle plant swaying
    plantsRef.current.forEach((plant, i) => {
      if (plant) {
        const time = clock.elapsedTime + i * 0.5
        plant.rotation.z = Math.sin(time * 0.5) * 0.05
      }
    })
  })

  // Create dust motes
  const dustMotes = useMemo(() => {
    const motes = []
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 20
      const y = Math.random() * 8 + 1
      const z = (Math.random() - 0.5) * 20

      motes.push(
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial
            color={0xffffff}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
      )
    }
    return motes
  }, [])

  // Create plants and flowers
  const plants = useMemo(() => {
    const plantArray = []

    // Planter beds with daisies
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 5
      const z = -3

      // Planter box
      plantArray.push(
        <mesh key={`planter-${i}`} position={[x, 0.3, z]} castShadow receiveShadow>
          <boxGeometry args={[3, 0.6, 1.5]} />
          <meshStandardMaterial color={0x654321} roughness={0.8} />
        </mesh>
      )

      // Soil
      plantArray.push(
        <mesh key={`soil-${i}`} position={[x, 0.61, z]}>
          <boxGeometry args={[2.9, 0.02, 1.4]} />
          <meshStandardMaterial color={0x3d2817} roughness={0.9} />
        </mesh>
      )

      // Daisies
      for (let j = 0; j < 8; j++) {
        const offsetX = (Math.random() - 0.5) * 2.5
        const offsetZ = (Math.random() - 0.5) * 1.2

        plantArray.push(
          <group
            key={`daisy-${i}-${j}`}
            position={[x + offsetX, 0.65, z + offsetZ]}
            ref={(el) => (plantsRef.current[i * 8 + j] = el)}
          >
            {/* Stem */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
              <meshStandardMaterial color={0x228b22} />
            </mesh>

            {/* Flower */}
            <mesh position={[0, 0.65, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
              <circleGeometry args={[0.15, 16]} />
              <meshStandardMaterial color={0xffffff} side={THREE.DoubleSide} />
            </mesh>

            {/* Center */}
            <mesh position={[0, 0.66, 0]} castShadow>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color={0xffd700} />
            </mesh>
          </group>
        )
      }
    }

    // Hanging pots
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 4
      const y = 6
      const z = (Math.random() - 0.5) * 10

      plantArray.push(
        <group key={`hanging-${i}`} position={[x, y, z]}>
          {/* Chain */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
            <meshStandardMaterial color={0x808080} metalness={0.7} roughness={0.3} />
          </mesh>

          {/* Pot */}
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.2, 0.4, 16]} />
            <meshStandardMaterial color={0x8b4513} roughness={0.6} />
          </mesh>

          {/* Foliage */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.4, 8, 8]} />
            <meshStandardMaterial color={0x228b22} roughness={0.8} />
          </mesh>
        </group>
      )
    }

    return plantArray
  }, [])

  return (
    <>
      {/* Fog */}
      <fogExp2 attach="fog" args={[0xfff8e7, 0.01]} />

      {/* Lighting - Overexposed warm sunlight */}
      <ambientLight intensity={0.8} color={0xffeedd} />

      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        color={0xffd7a3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      <pointLight position={[0, 5, 0]} intensity={0.6} color={0xffeedd} distance={25} />

      {/* Glass roof structure */}
      <group position={[0, 8, 0]}>
        {/* Glass panels */}
        {[-8, -4, 0, 4, 8].map((x) => (
          <mesh key={`roof-${x}`} position={[x, 0, 0]} rotation={[Math.PI / 6, 0, 0]}>
            <planeGeometry args={[4, 20]} />
            <meshPhysicalMaterial
              color={0xffffff}
              transparent
              opacity={0.3}
              roughness={0.1}
              metalness={0.1}
              transmission={0.8}
            />
          </mesh>
        ))}

        {/* Roof beams */}
        {[-8, -4, 0, 4, 8].map((x) => (
          <mesh key={`beam-${x}`} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 20, 8]} />
            <meshStandardMaterial color={0x8b7355} roughness={0.6} metalness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Floor - stone tiles */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[25, 25]} />
        <meshStandardMaterial color={0xd4c5b0} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Glass walls */}
      <mesh position={[0, 4, -12]} rotation={[0, 0, 0]}>
        <planeGeometry args={[25, 8]} />
        <meshPhysicalMaterial
          color={0xffffff}
          transparent
          opacity={0.2}
          roughness={0.1}
          metalness={0.1}
          transmission={0.9}
        />
      </mesh>

      <mesh position={[0, 4, 12]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[25, 8]} />
        <meshPhysicalMaterial
          color={0xffffff}
          transparent
          opacity={0.2}
          roughness={0.1}
          metalness={0.1}
          transmission={0.9}
        />
      </mesh>

      <mesh position={[-12, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[25, 8]} />
        <meshPhysicalMaterial
          color={0xffffff}
          transparent
          opacity={0.2}
          roughness={0.1}
          metalness={0.1}
          transmission={0.9}
        />
      </mesh>

      <mesh position={[12, 4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[25, 8]} />
        <meshPhysicalMaterial
          color={0xffffff}
          transparent
          opacity={0.2}
          roughness={0.1}
          metalness={0.1}
          transmission={0.9}
        />
      </mesh>

      {/* Plants and flowers */}
      {plants}

      {/* Floating dust motes */}
      <group ref={dustMotesRef}>{dustMotes}</group>

      {/* Return portal - window behind player */}
      <Portal
        type="return-window"
        geometry="window"
        position={[0, 1.25, 11]}
        rotation={[0, Math.PI, 0]}
        destination="origin"
        onEnter={onPortalEnter}
        camera={camera}
        isTransitioning={isTransitioning}
      />
    </>
  )
}
