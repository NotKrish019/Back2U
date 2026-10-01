import React from "react";
import { ThreeUIIntro } from "./src/shaders/neuform-isolated/NeuformIsolatedEffects";

export type TextAnimationCollectionProps = {
  variant: "threeui-intro";
  mode?: "dark" | "light";
  hue?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function TextAnimationCollection({
  variant,
  mode = "dark",
  hue = 0,
  saturation = 1,
  brightness = 1,
  className = "",
  style,
}: TextAnimationCollectionProps) {
  if (variant === "threeui-intro") {
    return (
      <ThreeUIIntro
        mode={mode}
        hue={hue}
        saturation={saturation}
        brightness={brightness}
        className={className}
        style={style}
      />
    );
  }
  return null;
}
