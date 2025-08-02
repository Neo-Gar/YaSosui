"use client";

import { motion, type Variants } from "motion/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 1.2,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const titleVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 60,
      filter: "blur(20px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 1.4,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.3,
      },
    },
  };

  const subtitleVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 40,
      filter: "blur(10px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 1.2,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.8,
      },
    },
  };

  const badgeVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.9,
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 1.2 + i * 0.1,
      },
    }),
  };

  const backgroundVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 1.1,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 2,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-white">
      {/* Minimalistic gradient background */}
      <motion.div
        variants={backgroundVariants}
        initial="hidden"
        animate="visible"
        className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50"
      />

      {/* Thin light effect */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            "radial-gradient(circle at 30% 30%, rgba(143, 129, 248, 0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 70% 70%, rgba(143, 129, 248, 0.1) 0%, transparent 50%)",
            "radial-gradient(circle at 30% 30%, rgba(143, 129, 248, 0.1) 0%, transparent 50%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="relative z-30 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Main title */}
        <motion.h1
          className="relative mb-8 text-8xl font-light tracking-tight text-black"
          style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
          variants={titleVariants}
        >
          <span className="font-light">YaSosui</span>
          <motion.span
            className="ml-6 font-medium"
            style={{ color: "#8F81F8" }}
            animate={{
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            SWAP
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mb-12 text-xl font-light tracking-wide text-gray-600"
          style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
          variants={subtitleVariants}
        >
          Decentralized exchange. Redefined.
        </motion.p>

        {/* Badges */}
        <motion.div
          className="flex justify-center gap-6"
          initial="hidden"
          animate="visible"
        >
          <motion.div
            custom={0}
            variants={badgeVariants}
            className="group relative flex items-center gap-4"
          >
            <motion.button
              className={`relative z-20 cursor-pointer rounded-full bg-gradient-to-r from-[#8F81F8] to-[#7C6EF8] px-8 py-4 font-medium tracking-wide text-white shadow-lg`}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2, ease: "easeOut" },
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                console.log("Button clicked!");
                router.push("/swap");
              }}
            >
              Create order
            </motion.button>
            <motion.button
              className={`relative z-20 cursor-pointer rounded-full bg-gradient-to-r from-[#8F81F8] to-[#7C6EF8] px-8 py-4 font-medium tracking-wide text-white shadow-lg`}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2, ease: "easeOut" },
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                console.log("Button clicked!");
                router.push("/orders");
              }}
            >
              View orders
            </motion.button>
            <motion.div
              className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20"
              initial={{ scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        </motion.div>

        {/* Thin line at the bottom */}
        <motion.div
          className="mx-auto mt-16 h-px w-32 bg-gradient-to-r from-transparent via-[#8F81F8] to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 2, duration: 1, ease: "easeOut" }}
        />
      </motion.div>
    </div>
  );
}
