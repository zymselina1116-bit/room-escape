import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export default function Controls({ currentScene, isTransitioning }) {
  const { camera, gl } = useThree()
  const keys = useRef({})
  const rotation = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const velocity = useRef(new THREE.Vector3())

  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.key.toLowerCase()] = true
    }

    const handleKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false
    }

    const handleMouseDown = (e) => {
      if (e.button === 0) {
        isDragging.current = true
        gl.domElement.style.cursor = 'grabbing'
      }
    }

    const handleMouseUp = () => {
      isDragging.current = false
      gl.domElement.style.cursor = 'grab'
    }

    const handleMouseMove = (e) => {
      if (isDragging.current && !isTransitioning) {
        const sensitivity = 0.002
        rotation.current.y -= e.movementX * sensitivity
        rotation.current.x -= e.movementY * sensitivity
        rotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.current.x))
      }
    }

    const handleWheel = (e) => {
      if (!isTransitioning) {
        e.preventDefault()
        // Reversed zoom: negative deltaY means zoom in (decrease FOV)
        camera.fov -= e.deltaY * 0.005
        camera.fov = Math.max(28, Math.min(75, camera.fov))
        camera.updateProjectionMatrix()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    gl.domElement.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    gl.domElement.addEventListener('wheel', handleWheel, { passive: false })

    gl.domElement.style.cursor = 'grab'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      gl.domElement.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      gl.domElement.removeEventListener('wheel', handleWheel)
    }
  }, [camera, gl, isTransitioning])

  useFrame((state, delta) => {
    if (isTransitioning) return

    // Apply camera rotation
    camera.rotation.set(0, 0, 0)
    camera.rotateY(rotation.current.y)
    camera.rotateX(rotation.current.x)

    // Movement
    const speed = 7.5
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
    right.normalize()

    const movement = new THREE.Vector3()

    // WASD and Arrow keys
    if (keys.current['w'] || keys.current['arrowup']) {
      movement.add(forward)
    }
    if (keys.current['s'] || keys.current['arrowdown']) {
      movement.sub(forward)
    }
    if (keys.current['a'] || keys.current['arrowleft']) {
      movement.sub(right)
    }
    if (keys.current['d'] || keys.current['arrowright']) {
      movement.add(right)
    }

    if (movement.length() > 0) {
      movement.normalize().multiplyScalar(speed * delta)

      // Smooth floating movement
      velocity.current.lerp(movement, 0.1)
      camera.position.add(velocity.current)

      // Boundary constraints (different per scene)
      if (currentScene === 'origin') {
        camera.position.x = Math.max(-7, Math.min(7, camera.position.x))
        camera.position.z = Math.max(-7, Math.min(7, camera.position.z))
        camera.position.y = Math.max(0.5, Math.min(3, camera.position.y))
      }
    } else {
      velocity.current.multiplyScalar(0.9)
    }

    // Subtle floating bob
    const bobAmount = Math.sin(state.clock.elapsedTime * 1.5) * 0.02
    camera.position.y = 1.6 + bobAmount
  })

  return null
}
