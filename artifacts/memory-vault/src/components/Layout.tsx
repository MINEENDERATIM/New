import { Link, useLocation } from "wouter";
import { Heart, Image as ImageIcon, Calendar, Plus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { motion } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/gallery", label: "Gallery", icon: ImageIcon },
    { href: "/timeline", label: "Timeline", icon: Calendar },
    { href: "/favorites", label: "Favorites", icon: Heart },
    { href: "/upload", label: "Upload", icon: Plus },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/gallery">
            <a className="text-xl font-serif tracking-tight text-primary hover:text-primary/80 transition-colors">
              Memory Vault
            </a>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                    location === item.href ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>

          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-background border-border/40">
                <div className="flex flex-col gap-6 mt-12">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <a
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 text-lg font-serif transition-colors hover:text-primary ${
                          location === item.href ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                      </a>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
