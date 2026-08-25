import DepthText from './DepthText.jsx'
import MoltenMetal from './MoltenMetal.jsx'

export default function Hero({ fileName, duration }) {
  const working = Boolean(fileName)

  return (
    <header className={`hero ${working ? 'is-working' : ''}`}>
      <div className="hero__field" aria-hidden="true">
        <MoltenMetal
          color1="#3A1D8F"
          color2="#7C5CFF"
          color3="#B7F5E2"
          speed={0.2}
          scale={3.1}
          detail={4}
          glow={2.1}
          coreSize={0.1}
          swirl={1.1}
          fold={-0.24}
          blackPoint={0.035}
          brightness={1.45}
          colorMode="molten"
          grainIntensity={0.035}
          mouseInteraction={false}
          opacity={working ? 0.4 : 0.9}
        />
      </div>

      <div className="hero__inner">
        <h1 className="hero__title">
          <DepthText
            text="SPLICE"
            layers={working ? 16 : 30}
            depth={working ? 1.5 : 2.3}
            faceColor="#F2F3FA"
            depthColor="#7C5CFF"
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
            {duration ? <span className="hero__loaded-dur">{duration}</span> : null}
          </p>
        )}
      </div>
    </header>
  )
}
