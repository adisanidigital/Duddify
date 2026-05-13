"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
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

/**
 * Smooth count-up of a number, formatted as currency.
 *
 * Implementation: subscribe to the spring with useMotionValueEvent and push
 * the formatted string into React state on every animation frame. Older
 * versions of this component used `<motion.span>{motionValue}</motion.span>`
 * which relied on motion's MotionValue-as-text-child behaviour — that
 * broke silently in some motion versions and rendered as empty text,
 * producing the "Net saved this month value is blank" bug. Using React
 * state is slightly less efficient but always renders.
 */
export function AnimatedCurrency({
  value,
  currency = "INR",
  locale = "en-IN",
  className,
}: {
  value: number;
  currency?: string;
  locale?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 110, damping: 22, mass: 0.8 });

  const [text, setText] = React.useState(() =>
    formatCurrency(Math.round(value), currency, locale)
  );

  React.useEffect(() => {
    // Honour prefers-reduced-motion by snapping straight to the value.
    if (reduceMotion) {
      mv.jump(value);
    } else {
      mv.set(value);
    }
    // Keep the displayed text in sync when currency/locale change too,
    // independent of any spring activity.
    setText(formatCurrency(Math.round(value), currency, locale));
  }, [value, currency, locale, reduceMotion, mv]);

  // Subscribe to the spring's frame updates and write the formatted value
  // into React state. This guarantees the text node actually renders even
  // if motion changes how it handles MotionValue children in the future.
  React.useEffect(() => {
    const unsub = spring.on("change", (v) => {
      setText(formatCurrency(Math.round(v), currency, locale));
    });
    return () => unsub();
  }, [spring, currency, locale]);

  return <span className={className}>{text}</span>;
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
  const reduceMotion = useReducedMotion();
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 110, damping: 22, mass: 0.8 });
  const [text, setText] = React.useState(() => `${Math.round(value)}${suffix}`);

  React.useEffect(() => {
    if (reduceMotion) mv.jump(value);
    else mv.set(value);
    setText(`${Math.round(value)}${suffix}`);
  }, [value, suffix, reduceMotion, mv]);

  React.useEffect(() => {
    const unsub = spring.on("change", (v) => {
      setText(`${Math.round(v)}${suffix}`);
    });
    return () => unsub();
  }, [spring, suffix]);

  return <span className={className}>{text}</span>;
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

/** Scale + lift on hover/tap — great for buttons & icon tiles. */
export function HoverScale({
  children,
  className,
  scale = 1.04,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  scale?: number;
} & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { scale, y: -1 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={SPRING}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Reveals contents on scroll-into-view. */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 16,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount: 0.2 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Shimmering skeleton block (data loading placeholder). */
export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-md bg-muted/60 " + (className ?? "")
      }
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
      />
    </div>
  );
}

/** Single line that flips with a 3D-like roll when value changes (like NumberFlow / Apple Wallet). */
export function FlipNumber({
  value,
  className,
  format = (v) => v.toString(),
}: {
  value: number | string;
  className?: string;
  format?: (v: number | string) => string;
}) {
  const display = format(value);
  return (
    <span className={"relative inline-block tabular-nums " + (className ?? "")}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={display}
          initial={{ y: "0.6em", opacity: 0, rotateX: -25 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: "-0.6em", opacity: 0, rotateX: 25 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="inline-block"
          style={{ transformOrigin: "50% 50% -10px" }}
        >
          {display}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** A delta chip that pulses when its value changes. */
export function PulseOnChange({
  trigger,
  children,
  className,
}: {
  trigger: string | number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={trigger}
      initial={{ scale: 0.92, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 480, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Lightweight celebratory burst. Pass a `trigger` (e.g. a counter) to fire it. */
export function ConfettiBurst({
  trigger,
  count = 14,
  colors = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444"],
}: {
  trigger: number;
  count?: number;
  colors?: string[];
}) {
  const reduce = useReducedMotion();
  if (reduce || trigger <= 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 60 + Math.random() * 60;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={`${trigger}-${i}`}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{
              x,
              y,
              scale: [0, 1, 0.8],
              opacity: [1, 1, 0],
              rotate: 360,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-sm"
            style={{ background: color }}
          />
        );
      })}
    </div>
  );
}

/** Tilt / parallax interaction — gentle 3D tilt on mouse-move. */
export function TiltCard({
  children,
  className,
  max = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-50, 50], [max, -max]), {
    stiffness: 220,
    damping: 22,
  });
  const ry = useSpring(useTransform(x, [-50, 50], [-max, max]), {
    stiffness: 220,
    damping: 22,
  });
  const reduce = useReducedMotion();

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }
  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Animated gradient ring border — for highlighting hero KPIs. */
export function GradientRing({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"relative rounded-2xl p-[1px] " + (className ?? "")}>
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-2xl opacity-70"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--success)), hsl(var(--primary)))",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative rounded-2xl bg-card">{children}</div>
    </div>
  );
}

export { motion, AnimatePresence };
