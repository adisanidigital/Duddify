"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type HTMLMotionProps,
  type Transition,
} from "motion/react";
import { formatCurrency } from "@/lib/utils";

const SPRING: Transition = { type: "spring", stiffness: 360, damping: 32, mass: 0.8 };
const EASE = [0.22, 1, 0.36, 1] as const;

/** Page-level fade + slight slide-in. Wrap any page contents. */
export function PageMotion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A single fade-up child. */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Stagger children with delay between siblings. */
export function StaggerChildren({
  children,
  className,
  delay = 0.04,
  initialDelay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  initialDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: delay, delayChildren: initialDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  ...rest
}: { children: React.ReactNode; className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Smooth count-up of a number, formatted as currency. */
export function AnimatedCurrency({
  value,
  currency = "INR",
  locale = "en-IN",
  duration = 0.9,
  className,
}: {
  value: number;
  currency?: string;
  locale?: string;
  duration?: number;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 110, damping: 22, mass: 0.8 });
  const display = useTransform(spring, (v) => formatCurrency(Math.round(v), currency, locale));

  React.useEffect(() => {
    mv.set(value);
    return () => {
      mv.set(value);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <motion.span className={className}>{display}</motion.span>;
}

/** Smooth count-up for a percent or plain integer. */
export function AnimatedNumber({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 110, damping: 22, mass: 0.8 });
  const display = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);

  React.useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  return <motion.span className={className}>{display}</motion.span>;
}

/** Card with hover-lift. */
export function HoverCard({
  children,
  className,
  ...rest
}: { children: React.ReactNode; className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={SPRING}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export { motion };
