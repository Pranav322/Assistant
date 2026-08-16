import { Composition } from "remotion";
import { HeroDemo, TOTAL_DURATION_IN_FRAMES } from "./HeroDemo";
import { FPS } from "./shared/theme";

export const HeroDemoComposition = () => {
  return (
    <Composition
      id="HeroDemo"
      component={HeroDemo}
      durationInFrames={TOTAL_DURATION_IN_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};