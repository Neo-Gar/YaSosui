"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { TokenLogo } from "../TokenLogo";

export const FloatingTokens = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const tokenConfigs = Array.from({ length: 100 }, (_, i) => {
    const seed = i * 12345;
    const startX = (seed % 100) + Math.sin(seed) * 20;
    const startY = ((seed * 2) % 100) + Math.cos(seed) * 20;
    const endX = ((seed * 3) % 100) + Math.sin(seed * 2) * 30;
    const endY = ((seed * 4) % 100) + Math.cos(seed * 2) * 30;

    const logos = ["ETH", "SUI"] as const;
    const logoType = logos[seed % logos.length] as string;
    const size = 0.6 + ((seed % 100) / 100) * 0.8;
    const opacity = 0.1 + ((seed % 100) / 100) * 0.3;

    return { startX, startY, endX, endY, logoType, size, opacity };
  });

  return (
    <>
      {/* Floating tokens */}
      {isLoaded &&
        tokenConfigs.map((config, i) => {
          return (
            <motion.div
              key={i}
              className="pointer-events-none absolute flex items-center justify-center"
              style={{
                width: `${config.size * 2}rem`,
                height: `${config.size * 2}rem`,
                opacity: config.opacity,
                zIndex: 1,
              }}
              initial={{
                left: `${config.startX}%`,
                top: `${config.startY}%`,
                opacity: 0,
                rotate: 0,
              }}
              animate={{
                left: `${config.endX}%`,
                top: `${config.endY}%`,
                opacity: [0, config.opacity, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 8 + (i % 4),
                repeat: Infinity,
                delay: i * 0.05,
                ease: "easeInOut",
              }}
            >
              <TokenLogo symbol={config.logoType} className="size-full" />
            </motion.div>
          );
        })}
    </>
  );
};
