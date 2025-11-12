import React, { useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import SceneManager from './SceneManager'
import Controls from './Controls'
import PostProcessing from './PostProcessing'
import AudioManager from './AudioManager'

export default function Experience() {
  const { gl } = useThree()

  // Configure renderer
  gl.shadowMap.enabled = true
  gl.shadowMap.type = THREE.PCFSoftShadowMap

  const [currentScene, setCurrentScene] = useState('origin')
  const [isTransitioning, setIsTransitioning] = useState(false)

  return (
    <>
      <Controls currentScene={currentScene} isTransitioning={isTransitioning} />

      <SceneManager
        currentScene={currentScene}
        setCurrentScene={setCurrentScene}
        isTransitioning={isTransitioning}
        setIsTransitioning={setIsTransitioning}
      />

      <PostProcessing isTransitioning={isTransitioning} />

      <AudioManager currentScene={currentScene} />
    </>
  )
}
