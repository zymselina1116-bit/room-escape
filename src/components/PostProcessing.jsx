import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, Vignette, DepthOfField } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

export default function PostProcessing({ isTransitioning }) {
  const composerRef = useRef()
  const transitionRef = useRef(0)
  const { gl, size } = useThree()

  useFrame((state, delta) => {
    // Transition effect
    if (isTransitioning) {
      transitionRef.current = Math.min(transitionRef.current + delta * 2, 1)
    } else {
      transitionRef.current = Math.max(transitionRef.current - delta * 2, 0)
    }

    // Apply exposure flash during transition
    if (composerRef.current) {
      const exposureBoost = transitionRef.current * 3
      gl.toneMappingExposure = 1.2 + exposureBoost
    }
  })

  // Adaptive DPR for mobile
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const dpr = isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2)
    gl.setPixelRatio(dpr)
  }, [gl])

  return (
    <EffectComposer ref={composerRef}>
      {/* Subtle Bloom */}
      <Bloom
        intensity={0.3}
        luminanceThreshold={0.8}
        luminanceSmoothing={0.9}
        mipmapBlur
      />

      {/* Very low Chromatic Aberration */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0005, 0.0005)}
      />

      {/* Soft Vignette */}
      <Vignette
        offset={0.3}
        darkness={0.5}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />

      {/* Slight DOF */}
      <DepthOfField
        focusDistance={0.02}
        focalLength={0.05}
        bokehScale={1}
        height={480}
      />
    </EffectComposer>
  )
}
