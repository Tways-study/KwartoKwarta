"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

const WORDS = ["kwarta", "Bayad", "Pera"];

export function FlipWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="relative inline-block" style={{ perspective: "800px" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={WORDS[index]}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block text-gold-deep"
          style={{ transformOrigin: "center center", backfaceVisibility: "hidden" }}
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
