import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

// Fresnel shader material for portal glow
const FresnelMaterial = shaderMaterial(
  {
    fresnelColor: new THREE.Color(1, 1, 1),
    glowIntensity: 0.5,
    time: 0
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    uniform float time;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  `
    uniform vec3 fresnelColor;
    uniform float glowIntensity;
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);

      // Subtle pulse
      float pulse = sin(time * 1.5) * 0.2 + 0.8;

      vec3 color = fresnelColor * fresnel * glowIntensity * pulse;
      float alpha = fresnel * glowIntensity * pulse;

      gl_FragColor = vec4(color, alpha);
    }
  `
)

extend({ FresnelMaterial })

export default function Portal({
  type,
  position,
  rotation = [0, 0, 0],
  destination,
  onEnter,
  camera,
  isTransitioning,
  geometry = 'door'
}) {
  const meshRef = useRef()
  const glowRef = useRef()
  const { size } = useThree()

  const portalGeometry = useMemo(() => {
    if (geometry === 'door') {
      return new THREE.BoxGeometry(1.2, 2.5, 0.1)
    } else if (geometry === 'window') {
      return new THREE.BoxGeometry(2.0, 2.5, 0.1)
    } else if (geometry === 'glass-door') {
      return new THREE.BoxGeometry(1.5, 2.5, 0.1)
    }
    return new THREE.BoxGeometry(1.2, 2.5, 0.1)
  }, [geometry])

  const portalMaterial = useMemo(() => {
    if (geometry === 'door') {
      return new THREE.MeshStandardMaterial({
        color: 0xa0826d,
        roughness: 0.6,
        metalness: 0.1
      })
    } else if (geometry === 'window' || geometry === 'glass-door') {
      return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8
      })
    }
    return new THREE.MeshStandardMaterial({ color: 0xa0826d })
  }, [geometry])

  useFrame(({ clock }) => {
    if (!meshRef.current || !camera || isTransitioning) return

    const portalWorldPos = new THREE.Vector3()
    meshRef.current.getWorldPosition(portalWorldPos)

    const distance = camera.position.distanceTo(portalWorldPos)

    // Update glow material time uniform for pulsing
    if (glowRef.current) {
      glowRef.current.time = clock.elapsedTime
    }

    // Proximity glow: brighten within 3m
    if (distance < 3) {
      const proximityIntensity = 1 - (distance / 3)
      if (glowRef.current) {
        glowRef.current.glowIntensity = 0.3 + proximityIntensity * 0.7
      }
    } else {
      if (glowRef.current) {
        glowRef.current.glowIntensity = 0.3
      }
    }

    // Check trigger conditions
    if (distance < 2.5) {
      // Check if portal is within ±25% of screen center
      const portalScreenPos = portalWorldPos.clone().project(camera)

      const centerThreshold = 0.25
      const isInCenterX = Math.abs(portalScreenPos.x) < centerThreshold
      const isInCenterY = Math.abs(portalScreenPos.y) < centerThreshold

      // Check if player is facing the portal
      const directionToPortal = new THREE.Vector3()
        .subVectors(portalWorldPos, camera.position)
        .normalize()

      const cameraDirection = new THREE.Vector3()
      camera.getWorldDirection(cameraDirection)

      const dotProduct = cameraDirection.dot(directionToPortal)
      const isFacing = dotProduct > 0.7 // ~45 degrees

      if (isInCenterX && isInCenterY && isFacing) {
        // Trigger portal!
        onEnter(destination)
      }
    }
  })

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={meshRef} geometry={portalGeometry} material={portalMaterial} castShadow receiveShadow>
        {/* Fresnel glow rim */}
        <mesh scale={1.05}>
          <boxGeometry args={portalGeometry === 'door' ? [1.2, 2.5, 0.1] : [2.0, 2.5, 0.1]} />
          <fresnelMaterial
            ref={glowRef}
            transparent
            depthWrite={false}
            fresnelColor={new THREE.Color(0xffd7a3)}
            glowIntensity={0.3}
          />
        </mesh>
      </mesh>

      {/* Door handle for door type */}
      {geometry === 'door' && (
        <mesh position={[0.4, 0, 0.1]} castShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={0xffd700} metalness={0.8} roughness={0.2} />
        </mesh>
      )}
    </group>
  )
}
