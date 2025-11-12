import { useEffect, useRef } from 'react'

export default function AudioManager({ currentScene }) {
  const audioContextRef = useRef(null)
  const gainNodeRef = useRef(null)
  const oscillatorsRef = useRef([])

  useEffect(() => {
    // Create audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.connect(audioContextRef.current.destination)
      gainNodeRef.current.gain.value = 0.15
    }

    const audioContext = audioContextRef.current
    const gainNode = gainNodeRef.current

    // Stop all previous oscillators
    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop()
      } catch (e) {
        // Ignore
      }
    })
    oscillatorsRef.current = []

    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    // Scene-specific audio
    if (currentScene === 'origin') {
      // Low air hum + distant birds + gentle irregular ticking

      // Air hum (low frequency)
      const hum = audioContext.createOscillator()
      hum.type = 'sine'
      hum.frequency.value = 80
      const humGain = audioContext.createGain()
      humGain.gain.value = 0.3
      hum.connect(humGain)
      humGain.connect(gainNode)
      hum.start()
      oscillatorsRef.current.push(hum)

      // Distant birds (high frequency, modulated)
      const bird = audioContext.createOscillator()
      bird.type = 'sine'
      bird.frequency.value = 1800
      const birdGain = audioContext.createGain()
      birdGain.gain.value = 0.05

      // LFO for bird chirp modulation
      const birdLFO = audioContext.createOscillator()
      birdLFO.type = 'sine'
      birdLFO.frequency.value = 0.3
      const birdLFOGain = audioContext.createGain()
      birdLFOGain.gain.value = 100
      birdLFO.connect(birdLFOGain)
      birdLFOGain.connect(bird.frequency)

      bird.connect(birdGain)
      birdGain.connect(gainNode)
      bird.start()
      birdLFO.start()
      oscillatorsRef.current.push(bird, birdLFO)

      // Ticking (irregular clicks)
      const tickInterval = setInterval(() => {
        const click = audioContext.createOscillator()
        const clickGain = audioContext.createGain()
        click.frequency.value = 800
        clickGain.gain.value = 0.1

        click.connect(clickGain)
        clickGain.connect(gainNode)
        click.start()
        click.stop(audioContext.currentTime + 0.01)

        clickGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.01)
      }, 1500 + Math.random() * 1000)

      return () => clearInterval(tickInterval)

    } else if (currentScene === 'pool') {
      // Footstep echo + gentle drip SFX

      // Water ambience (low filtered noise)
      const water = audioContext.createOscillator()
      water.type = 'sine'
      water.frequency.value = 150
      const waterGain = audioContext.createGain()
      waterGain.gain.value = 0.25
      water.connect(waterGain)
      waterGain.connect(gainNode)
      water.start()
      oscillatorsRef.current.push(water)

      // Drip sounds
      const dripInterval = setInterval(() => {
        const drip = audioContext.createOscillator()
        const dripGain = audioContext.createGain()
        drip.frequency.value = 1200
        dripGain.gain.value = 0.15

        drip.connect(dripGain)
        dripGain.connect(gainNode)
        drip.start()
        drip.stop(audioContext.currentTime + 0.05)

        dripGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05)
      }, 2000 + Math.random() * 3000)

      return () => clearInterval(dripInterval)

    } else if (currentScene === 'garden') {
      // Gentle wind + birds SFX

      // Wind (noise-like)
      const wind = audioContext.createOscillator()
      wind.type = 'sawtooth'
      wind.frequency.value = 200
      const windGain = audioContext.createGain()
      windGain.gain.value = 0.2

      // LFO for wind variation
      const windLFO = audioContext.createOscillator()
      windLFO.type = 'sine'
      windLFO.frequency.value = 0.5
      const windLFOGain = audioContext.createGain()
      windLFOGain.gain.value = 50
      windLFO.connect(windLFOGain)
      windLFOGain.connect(wind.frequency)

      wind.connect(windGain)
      windGain.connect(gainNode)
      wind.start()
      windLFO.start()
      oscillatorsRef.current.push(wind, windLFO)

      // Birds chirping
      const birdInterval = setInterval(() => {
        const chirp = audioContext.createOscillator()
        const chirpGain = audioContext.createGain()
        chirp.frequency.value = 2000 + Math.random() * 500
        chirpGain.gain.value = 0.1

        chirp.connect(chirpGain)
        chirpGain.connect(gainNode)
        chirp.start()

        // Chirp envelope
        chirp.frequency.exponentialRampToValueAtTime(
          chirp.frequency.value * 1.5,
          audioContext.currentTime + 0.1
        )
        chirp.stop(audioContext.currentTime + 0.15)
        chirpGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15)
      }, 3000 + Math.random() * 4000)

      return () => clearInterval(birdInterval)

    } else if (currentScene === 'hallway') {
      // Subtle reverb ambience

      // Low drone
      const drone = audioContext.createOscillator()
      drone.type = 'triangle'
      drone.frequency.value = 110
      const droneGain = audioContext.createGain()
      droneGain.gain.value = 0.2
      drone.connect(droneGain)
      droneGain.connect(gainNode)
      drone.start()
      oscillatorsRef.current.push(drone)

      // Reverb-like echoes (simple delayed oscillations)
      const echoInterval = setInterval(() => {
        const echo = audioContext.createOscillator()
        const echoGain = audioContext.createGain()
        echo.frequency.value = 440
        echoGain.gain.value = 0.05

        echo.connect(echoGain)
        echoGain.connect(gainNode)
        echo.start()
        echo.stop(audioContext.currentTime + 0.3)

        echoGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)
      }, 5000 + Math.random() * 5000)

      return () => clearInterval(echoInterval)
    }

    // Cleanup
    return () => {
      oscillatorsRef.current.forEach((osc) => {
        try {
          osc.stop()
        } catch (e) {
          // Ignore
        }
      })
      oscillatorsRef.current = []
    }
  }, [currentScene])

  // User interaction to unlock audio
  useEffect(() => {
    const handleInteraction = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
      }
    }

    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  return null
}
