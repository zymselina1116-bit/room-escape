# Dreamcore 3D Portal Experience

An immersive web-based 3D interactive experience built with React Three Fiber, featuring dreamcore aesthetics and mystery exploration.

## Features

### Origin Room
- Bright European-style room (16×9×16 units) with cream plaster walls and polished wood floor
- Three permanent, re-enterable portals:
  - **North Wall**: Large arched wooden door → Hallway Scene
  - **East Wall**: Tall glass door → Pool Scene
  - **West Wall**: Tall window → Garden Scene
- Soft daylight with volumetric rays
- Subtle variations on each return (light angle ±3°, clock tempo ±2%)

### Pool Scene
- Long corridor of repeating round arches (radius ~6, spacing 10)
- White tiles with animated ripples and caustics
- Green-blue water plane with shader effects
- Soft green-white lamps along the corridor
- Glass door portal returns to origin

### Garden Scene
- Bright conservatory with glass roof
- Hanging pots and planter beds with daisies
- Overexposed warm sunlight with floating dust motes
- Gentle plant swaying animation
- Window portal returns to origin

### Hallway Scene
- Endless stone arcade with repeating arches
- Glossy stone floor and warm wall lamps
- Lamp warmth decreases with distance
- Fog cutoff to imply infinity
- Large arched door returns to origin

## Controls

- **Movement**: WASD or Arrow keys for smooth floating movement (speed ~7.5)
- **Look**: Mouse drag to rotate camera
- **Zoom**: Mouse wheel (reversed: scroll down to zoom in)
  - FOV range: 28°-75°
- **Camera Start**: Position (0, 1.6, 4), looks at origin

## Portal Mechanics

Portals trigger when:
1. Player is facing the portal
2. Portal center is within ±25% of screen center
3. Distance < 2.5m

All portals remain after use and are always re-enterable.

## Technical Details

### Rendering
- ACESFilmic tone mapping (exposure 1.2)
- Soft PCF shadows (2048² shadow maps)
- FogExp2 (density ~0.008, near feel 25, far feel 90)

### Post-Processing
- Subtle Bloom
- Very low Chromatic Aberration
- Soft Vignette
- Slight Depth of Field

### Audio
- **Origin**: Low air hum + distant birds + gentle irregular ticking
- **Pool**: Water ambience + gentle drip sounds
- **Garden**: Wind + bird chirps
- **Hallway**: Low drone + reverb echoes

### Performance
- Adaptive DPR for mobile devices
- Smooth 60 FPS target
- Optimized instancing for repeated geometry

## Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev

# Build for production
npm run build
```

## Aesthetic

**Dreamcore × Mystery**
- Calm and slightly uncanny atmosphere
- Warm whites, faded golds, muted sky blues, desaturated browns
- No text UI - pure diegetic interaction
- Transitions conveyed through light, motion, and sound

## Project Structure

```
src/
├── components/
│   ├── Experience.jsx          # Main scene container
│   ├── Controls.jsx            # Camera and input controls
│   ├── SceneManager.jsx        # Scene state management
│   ├── Portal.jsx              # Reusable portal component
│   ├── PostProcessing.jsx      # Visual effects
│   ├── AudioManager.jsx        # Procedural audio system
│   ├── IntroText.jsx           # Intro fade text
│   └── scenes/
│       ├── OriginRoom.jsx      # Main hub room
│       ├── PoolScene.jsx       # Tiled pool corridor
│       ├── GardenScene.jsx     # Glass conservatory
│       └── HallwayScene.jsx    # Stone arcade
├── App.jsx                     # Root component
├── main.jsx                    # Entry point
└── styles.css                  # Global styles
```

## Credits

Built with:
- [React](https://react.dev/)
- [Three.js](https://threejs.org/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [@react-three/drei](https://github.com/pmndrs/drei)
- [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing)
- [Vite](https://vitejs.dev/)
