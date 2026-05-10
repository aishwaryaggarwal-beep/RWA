"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "tsparticles-slim";
import { loadFull } from "tsparticles";
export default function ParticleBackground() {
  const [init, setInit] = useState(false);

  useEffect(() => {
   initParticlesEngine(async (engine: any) => {
  await loadFull(engine);
}).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) return null;

  return (
    <Particles
      id="tsparticles"
      options={{
        fullScreen: { enable: true, zIndex: -1 },

        background: {
          color: "transparent",
        },

        particles: {
          number: { value: 60 },
          color: { value: "#ffffff" },

          links: {
            enable: true,
            distance: 120,
            color: "#7c3aed",
            opacity: 0.4,
            width: 1,
          },

          move: {
            enable: true,
            speed: 1,
          },

          size: {
            value: { min: 1, max: 3 },
          },

          opacity: {
            value: 0.5,
          },
        },
      }}
    />
  );
}