import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";

const stagger = {
  animate: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function HeroSection() {
  const circleRef = useRef<HTMLDivElement>(null);

  // Parallax on mouse move
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!circleRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      circleRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <section className="relative min-h-screen hero-bg grain-overlay flex items-center overflow-hidden">
      {/* Decorative background circles */}
      <div
        ref={circleRef}
        className="hero-circle w-[600px] h-[600px] -top-32 -right-48 transition-transform duration-700 ease-out"
        style={{ position: "absolute" }}
      />
      <div
        className="hero-circle w-[400px] h-[400px] -bottom-20 -left-32"
        style={{
          position: "absolute",
          background: "linear-gradient(135deg, #cfdcbc 0%, #6f8a4a 100%)",
        }}
      />

      {/* Floating product images */}
      <motion.div
        className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block"
        initial={{ opacity: 0, x: 80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative w-[420px] h-[520px]">
          {/* Main product */}
          <motion.div
            className="absolute right-0 bottom-0 w-72 h-96 overflow-hidden shadow-2xl"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <img
              src="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80"
              alt="Lumière Radiance Serum"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/30 to-transparent" />
          </motion.div>
          {/* Secondary product */}
          <motion.div
            className="absolute left-0 top-0 w-44 h-56 overflow-hidden shadow-xl"
            animate={{ y: [0, 12, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1574156863536-37fbc5e1cfef?w=400&q=80"
              alt="Lumière Moisturizer"
              className="w-full h-full object-cover"
            />
          </motion.div>
          {/* Badge */}
          <motion.div
            className="absolute left-4 bottom-8 bg-white/90 backdrop-blur-sm px-4 py-3 shadow-lg"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={10}
                  className="fill-[#c9a96e] text-[#c9a96e]"
                />
              ))}
            </div>
            <p className="text-xs font-medium">4.9 / 5 · 2,847 Reviews</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="container-custom relative z-10 pt-24 pb-16">
        <motion.div
          className="max-w-2xl"
          variants={stagger}
          initial="initial"
          animate="animate"
        >
          {/* Eyebrow */}
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-8 h-px bg-[#c9a96e]" />
            <span className="font-body text-xs font-medium tracking-[0.2em] uppercase text-[#c9a96e]">
              New Collection 2025
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp} className="heading-hero mb-6">
            Skin that{" "}
            <span className="font-accent italic text-[#c9a96e]">glows</span>{" "}
            from within
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={fadeUp}
            className="text-lg text-charcoal-600 leading-relaxed mb-10 max-w-lg"
          >
            Science-backed formulations crafted with the world's purest
            ingredients. Discover your radiance ritual.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-16">
            <Link to="/shop" className="btn-primary">
              Shop Collection <ArrowRight size={16} />
            </Link>
            <Link to="/rituals" className="btn-outline">
              Build My Routine
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} className="flex gap-10">
            {[
              { value: "50K+", label: "Happy Customers" },
              { value: "100%", label: "Clean Ingredients" },
              { value: "#1", label: "Bestselling Serum" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-2xl md:text-3xl font-semibold text-charcoal-900">
                  {stat.value}
                </p>
                <p className="text-xs text-charcoal-500 tracking-wide mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-xs tracking-[0.15em] uppercase text-charcoal-500">
          Scroll
        </span>
        <motion.div
          className="w-px h-12 bg-gradient-to-b from-charcoal-400 to-transparent"
          animate={{ scaleY: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>
    </section>
  );
}
