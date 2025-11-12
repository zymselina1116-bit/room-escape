import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Portal from '../Portal'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

// Water shader with ripples
const WaterMaterial = shaderMaterial(
  {
    time: 0,
    waterColor: new THREE.Color(0x20b2aa),
    opacity: 0.7
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;

    void main() {
      vUv = uv;
      vPosition = position;

      // Ripple effect
      float ripple = sin(position.x * 2.0 + time) * 0.02 + sin(position.y * 3.0 + time * 1.3) * 0.02;
      vec3 newPosition = position + vec3(0.0, 0.0, ripple);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform vec3 waterColor;
    uniform float opacity;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // Animated caustics pattern
      float caustic1 = sin(vUv.x * 20.0 + time) * sin(vUv.y * 20.0 + time * 1.2);
      float caustic2 = sin((vUv.x + vUv.y) * 15.0 - time * 0.8);
      float caustics = (caustic1 + caustic2) * 0.3 + 0.7;

      vec3 color = waterColor * caustics;
      gl_FragColor = vec4(color, opacity);
    }
  `
)

extend({ WaterMaterial })

export default function PoolScene({ onPortalEnter, camera, isTransitioning }) {
  const waterRef = useRef()

  useFrame(({ clock }) => {
    if (waterRef.current) {
      waterRef.current.time = clock.elapsedTime
    }
  })

  // Create repeating arches
  const arches = useMemo(() => {
    const archArray = []
    const archCount = 10
    const archSpacing = 10
    const archRadius = 6

    for (let i = 0; i < archCount; i++) {
      archArray.push(
        <group key={i} position={[0, 0, -i * archSpacing]}>
          {/* Arch structure */}
          <mesh position={[0, archRadius, 0]} receiveShadow>
            <torusGeometry args={[archRadius, 0.3, 16, 32, Math.PI]} />
            <meshStandardMaterial color={0xffffff} roughness={0.3} metalness={0.1} />
          </mesh>

          {/* Left pillar */}
          <mesh position={[-archRadius, archRadius / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.6, archRadius, 0.6]} />
            <meshStandardMaterial color={0xffffff} roughness={0.3} metalness={0.1} />
          </mesh>

          {/* Right pillar */}
          <mesh position={[archRadius, archRadius / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.6, archRadius, 0.6]} />
            <meshStandardMaterial color={0xffffff} roughness={0.3} metalness={0.1} />
          </mesh>
        </group>
      )
    }

    return archArray
  }, [])

  return (
    <>
      {/* Fog */}
      <fogExp2 attach="fog" args={[0x20b2aa, 0.015]} />

      {/* Lighting */}
      <ambientLight intensity={0.4} color={0xc8ffff} />

      <pointLight position={[0, 8, 0]} intensity={0.6} color={0xffffff} distance={30} />
      <pointLight position={[0, 5, -20]} intensity={0.5} color={0xc8ffff} distance={25} />
      <pointLight position={[0, 5, -40]} intensity={0.4} color={0xc8ffff} distance={25} />

      {/* Repeating soft green-white lamps */}
      {[0, -10, -20, -30, -40, -50, -60, -70].map((z) => (
        <React.Fragment key={z}>
          <pointLight position={[-5, 4, z]} intensity={0.5} color={0xd4ffcc} distance={15} castShadow />
          <pointLight position={[5, 4, z]} intensity={0.5} color={0xd4ffcc} distance={15} castShadow />

          {/* Lamp meshes */}
          <mesh position={[-5, 4, z]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color={0xffffe0} />
          </mesh>
          <mesh position={[5, 4, z]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color={0xffffe0} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Floor - white tiles */}
      <mesh position={[0, 0, -40]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[15, 100]} />
        <meshStandardMaterial color={0xf5f5f5} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Water plane - animated ripples and caustics */}
      <mesh position={[0, 3, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 100, 50, 50]} />
        <waterMaterial ref={waterRef} transparent waterColor={new THREE.Color(0x20b2aa)} opacity={0.7} />
      </mesh>

      {/* Walls */}
      <mesh position={[-7.5, 6, -40]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[100, 12]} />
        <meshStandardMaterial color={0xffffff} roughness={0.3} metalness={0.1} />
      </mesh>

      <mesh position={[7.5, 6, -40]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[100, 12]} />
        <meshStandardMaterial color={0xffffff} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 12, -40]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[15, 100]} />
        <meshStandardMaterial color={0xf0f0f0} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Repeating arches */}
      {arches}

      {/* Return portal - glass door behind player */}
      <Portal
        type="return-glass-door"
        geometry="glass-door"
        position={[0, 3, 5]}
        rotation={[0, 0, 0]}
        destination="origin"
        onEnter={onPortalEnter}
        camera={camera}
        isTransitioning={isTransitioning}
      />
    </>
  )
}
