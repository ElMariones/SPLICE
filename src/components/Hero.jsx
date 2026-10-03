import { memo } from 'react'
import DepthText from './DepthText.jsx'
import MoltenMetal from './MoltenMetal.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { useTheme } from '../lib/theme.js'

// The React Bits pieces paint to a canvas and to inline styles, so they cannot
// read CSS tokens — each theme passes its own colours in.
const FIELD = {
  dark: { color1: '#3A1D8F', color2: '#7C5CFF', color3: '#B7F5E2', brightness: 1.45, blackPoint: 0.035 },
  light: { color1: '#C4B5FD', color2: '#6039E8', color3: '#0F766E', brightness: 1.1, blackPoint: 0.09 }
}

const TITLE = {
  dark: { face: '#F2F3FA', depth: '#7C5CFF' },
  light: { face: '#171833', depth: '#6039E8' }
}

function Hero({ fileName, fileSize, duration }) {
  const working = Boolean(fileName)
  const { theme } = useTheme()
  const field = FIELD[theme]
  const title = TITLE[theme]

  return (
    <header className={`hero ${working ? 'is-working' : ''}`}>
      <div className="hero__field" aria-hidden="true">
        <MoltenMetal
          color1={field.color1}
          color2={field.color2}
          color3={field.color3}
          speed={0.2}
          scale={3.1}
          detail={4}
          glow={2.1}
          coreSize={0.1}
          swirl={1.1}
          fold={-0.24}
          blackPoint={field.blackPoint}
          brightness={field.brightness}
          colorMode="molten"
          grainIntensity={0.035}
          mouseInteraction={false}
          opacity={working ? 0.4 : theme === 'light' ? 0.7 : 0.9}
        />
      </div>

      <ThemeToggle />

      <div className="hero__inner">
        <h1 className="hero__title">
          <DepthText
            text="SPLICE"
            layers={working ? 16 : 30}
            depth={working ? 1.5 : 2.3}
            faceColor={title.face}
            depthColor={title.depth}
            tilt={6}
            smoothing={0.12}
            orbitSpeed={0.2}
            fontSize={working ? 'clamp(1.9rem, 5vw, 3rem)' : 'clamp(3.6rem, 14vw, 9rem)'}
            fontWeight={800}
          />
        </h1>

        <p className="hero__tag">
          Video splitter<span className="hero__tag-dot" />runs locally
        </p>

        {working && (
          <p className="hero__loaded">
            <span className="hero__loaded-label">Loaded</span>
            <span className="hero__loaded-name">{fileName}</span>
            {fileSize ? <span className="hero__loaded-size">{sizeLabel(fileSize)}</span> : null}
            {duration ? <span className="hero__loaded-dur">{duration}</span> : null}
          </p>
        )}
      </div>
    </header>
  )
}

export default memo(Hero)

function sizeLabel(bytes) {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`
}
