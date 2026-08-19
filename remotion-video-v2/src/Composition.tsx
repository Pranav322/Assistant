import { AbsoluteFill, Composition } from "remotion";
import { HeroDemo, TOTAL_DURATION_IN_FRAMES } from "./HeroDemo";
import { FPS } from "./shared/theme";

// Two compositions, one scene tree. `.ct-dark` swaps the CSS custom properties
// every component reads (see index.css), so the dark cut is the same video with
// a different palette — nothing to keep in sync by hand.
const HeroDemoDark: React.FC = () => (
  <AbsoluteFill className="ct-dark">
    <HeroDemo />
  </AbsoluteFill>
);

const shared = {
  durationInFrames: TOTAL_DURATION_IN_FRAMES,
  fps: FPS,
  width: 1920,
  height: 1080,
} as const;

export const HeroDemoComposition = () => (
  <>
    <Composition id="HeroDemo" component={HeroDemo} {...shared} />
    <Composition id="HeroDemoDark" component={HeroDemoDark} {...shared} />
  </>
);
