import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useListMemories, getListMemoriesQueryKey, useToggleFavorite, Memory } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, X, ChevronLeft, ChevronRight, LayoutGrid, Rows } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Gallery({ showFavoritesOnly = false }: { showFavoritesOnly?: boolean }) {
  const [search, setSearch] = useState("");
  const [layoutMode, setLayoutMode] = useState<"grid" | "masonry">("masonry");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: memories, isLoading } = useListMemories({
    search: search || undefined,
    favorites: showFavoritesOnly ? true : undefined,
  });

  const queryClient = useQueryClient();
  const toggleFavorite = useToggleFavorite();

  const handleToggleFavorite = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate({ id }, {
      onSuccess: (updatedMemory) => {
        queryClient.setQueryData(getListMemoriesQueryKey({ search: search || undefined, favorites: showFavoritesOnly ? true : undefined }), (old: Memory[] | undefined) => {
          if (!old) return old;
          return old.map((m) => m.id === id ? updatedMemory : m);
        });
      }
    });
  };

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (lightboxIndex === null || !memories) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : memories.length - 1));
    if (e.key === "ArrowRight") setLightboxIndex((prev) => (prev! < memories.length - 1 ? prev! + 1 : 0));
  }, [lightboxIndex, memories]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-4xl font-serif">{showFavoritesOnly ? "Favorites" : "Gallery"}</h1>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search memories..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50 border-border/40 focus-visible:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2 border border-border/40 rounded-md p-1 bg-background/50">
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${layoutMode === "grid" ? "bg-muted" : ""}`} onClick={() => setLayoutMode("grid")}>
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${layoutMode === "masonry" ? "bg-muted" : ""}`} onClick={() => setLayoutMode("masonry")}>
                <Rows className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted/20 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !memories?.length ? (
          <div className="text-center py-32">
            <p className="text-xl font-serif text-muted-foreground mb-6">No memories found.</p>
            <Link href="/upload" className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
              Upload Your First Memory
            </Link>
          </div>
        ) : (
          <div className={layoutMode === "grid" 
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            : "columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4"
          }>
            {memories.map((memory, index) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`relative group rounded-lg overflow-hidden cursor-pointer ${layoutMode === "masonry" ? "break-inside-avoid" : "aspect-square"}`}
                onClick={() => openLightbox(index)}
              >
                <img 
                  src={memory.fileUrl} 
                  alt={memory.title}
                  loading="lazy"
                  className={`w-full ${layoutMode === "grid" ? "h-full object-cover" : "h-auto object-contain"} transition-transform duration-700 group-hover:scale-105`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="text-white font-serif text-lg line-clamp-1">{memory.title}</h3>
                  <p className="text-white/80 text-sm">{format(new Date(memory.date), "MMMM d, yyyy")}</p>
                </div>
                <button 
                  onClick={(e) => handleToggleFavorite(e, memory.id)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
                >
                  <Heart className={`w-5 h-5 transition-colors ${memory.isFavorite ? "fill-primary text-primary" : "text-white"}`} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxIndex !== null && memories && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center"
            >
              <button onClick={closeLightbox} className="absolute top-6 right-6 p-2 text-white/70 hover:text-white z-50">
                <X className="w-8 h-8" />
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev! > 0 ? prev! - 1 : memories.length - 1); }}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white z-50"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev! < memories.length - 1 ? prev! + 1 : 0); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white z-50"
              >
                <ChevronRight className="w-10 h-10" />
              </button>

              <div className="relative w-full max-w-5xl h-[80vh] flex flex-col items-center justify-center p-4">
                <img 
                  src={memories[lightboxIndex].fileUrl} 
                  alt={memories[lightboxIndex].title}
                  className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
                />
                <div className="absolute bottom-[-60px] left-0 right-0 text-center">
                  <h2 className="text-2xl font-serif text-white mb-1">{memories[lightboxIndex].title}</h2>
                  <p className="text-white/60">{format(new Date(memories[lightboxIndex].date), "MMMM d, yyyy")}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
