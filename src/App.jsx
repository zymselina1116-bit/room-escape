import React, { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Experience from './components/Experience'
import IntroText from './components/IntroText'
import './styles.css'

function App() {
  const [showIntro, setShowIntro] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false)
    }, 10000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.6, 4], fov: 55 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
        shadows="soft"
      >
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
      {showIntro && <IntroText />}
    </>
  )
}

export default App
