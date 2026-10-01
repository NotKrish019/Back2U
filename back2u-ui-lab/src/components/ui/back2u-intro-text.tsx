"use client";

import React from "react";
import { TextAnimationCollection } from "../threeui/TextAnimationCollection";
import "../threeui/src/shaders/threeui.css";

export default function Back2UIntroText() {
  return (
    <section id="intro-text" className="relative w-full h-[100svh] bg-black">
      <TextAnimationCollection
        variant="threeui-intro"
        mode="dark"
        hue={0}
        saturation={1}
        brightness={1}
      />
    </section>
  );
}
