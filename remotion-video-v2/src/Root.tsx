import "./index.css";
import { loadFont } from "@remotion/google-fonts/Inter";
import { HeroDemoComposition } from "./Composition";

loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <HeroDemoComposition />
    </>
  );
};