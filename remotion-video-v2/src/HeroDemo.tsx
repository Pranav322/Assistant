import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { CreateProject } from "./scenes/CreateProject";
import { DashboardIngest } from "./scenes/DashboardIngest";
import { EmbedCode } from "./scenes/EmbedCode";
import { ChatConversation } from "./scenes/ChatConversation";
import { OutroCTA } from "./scenes/OutroCTA";
import { theme } from "./shared/theme";

const SCENE_DURATIONS = {
  createProject: 230,
  ingestion: 220,
  embed: 150,
  chat: 180,
  outro: 120,
};

const TRANSITION_FRAMES = 12;

export const TOTAL_DURATION_IN_FRAMES =
  SCENE_DURATIONS.createProject +
  SCENE_DURATIONS.ingestion +
  SCENE_DURATIONS.embed +
  SCENE_DURATIONS.chat +
  SCENE_DURATIONS.outro -
  TRANSITION_FRAMES * 4;

export const HeroDemo: React.FC = () => {
  const transition = () => (
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
    />
  );

  return (
    <AbsoluteFill style={{ background: theme.background }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.createProject}>
          <CreateProject />
        </TransitionSeries.Sequence>
        {transition()}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.ingestion}>
          <DashboardIngest />
        </TransitionSeries.Sequence>
        {transition()}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.embed}>
          <EmbedCode />
        </TransitionSeries.Sequence>
        {transition()}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.chat}>
          <ChatConversation />
        </TransitionSeries.Sequence>
        {transition()}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.outro}>
          <OutroCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};