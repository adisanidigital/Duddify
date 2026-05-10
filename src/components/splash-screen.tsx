"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallet } from "lucide-react";

export function SplashScreen({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] grid place-items-center bg-background safe-top safe-bottom overflow-hidden"
        >
          {/* Animated gradient mesh */}
          <div className="absolute inset-0 -z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, ease: "easeOut", delay: 0.05 }}
              className="absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-emerald-400/25 blur-3xl"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4, delay: 0.2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[24rem] w-[24rem] rounded-full bg-cyan-500/15 blur-3xl"
            />
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
          </div>

          <div className="flex flex-col items-center gap-6">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 18,
                mass: 0.9,
              }}
              className="relative"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0 0 hsl(var(--primary) / 0.5), 0 20px 60px -10px hsl(var(--primary) / 0.6)",
                    "0 0 0 24px hsl(var(--primary) / 0), 0 24px 70px -8px hsl(var(--primary) / 0.7)",
                    "0 0 0 0 hsl(var(--primary) / 0.5), 0 20px 60px -10px hsl(var(--primary) / 0.6)",
                  ],
                }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="h-24 w-24 rounded-3xl gradient-primary text-primary-foreground grid place-items-center"
              >
                <Wallet className="h-12 w-12" strokeWidth={2.4} />
              </motion.div>
            </motion.div>

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center space-y-2"
            >
              <div className="text-4xl md:text-5xl font-bold tracking-tight">
                <span className="gradient-text-primary">Duddify</span>
              </div>
              <motion.div
                initial={{ opacity: 0, letterSpacing: "0.4em" }}
                animate={{ opacity: 0.8, letterSpacing: "0.18em" }}
                transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-[11px] md:text-xs uppercase font-medium text-muted-foreground"
              >
                Money, together
              </motion.div>
            </motion.div>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex items-center gap-1.5 mt-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.2, 0.8] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.18,
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
