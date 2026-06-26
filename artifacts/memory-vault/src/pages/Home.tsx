import { motion } from "framer-motion";
import { Link } from "wouter";
import { Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-screen"
        style={{
          backgroundImage: 'url(/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Vignette/Gradient overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />

      {/* Floating particles (simple CSS/motion implementation) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary/20 blur-sm"
            style={{
              width: Math.random() * 6 + 2 + "px",
              height: Math.random() * 6 + 2 + "px",
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-4 flex flex-col items-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-serif text-foreground mb-6 tracking-tight drop-shadow-lg"
        >
          Memory Vault
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-lg md:text-xl text-muted-foreground font-serif italic mb-12 max-w-md mx-auto"
        >
          A private sanctuary for the moments we never want to forget.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <Link href="/gallery" className="inline-flex items-center gap-2 bg-primary/90 hover:bg-primary text-primary-foreground px-8 py-4 rounded-full font-serif text-lg transition-all duration-300 shadow-[0_0_40px_-10px_hsl(var(--primary))] hover:shadow-[0_0_60px_-10px_hsl(var(--primary))]">
            Open Our Memories <Heart className="w-5 h-5 fill-current" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
