import { Layout } from "@/components/Layout";
import { useGetMemory, useDeleteMemory, useToggleFavorite, getGetMemoryQueryKey, getListMemoriesQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { Heart, Trash2, MapPin, Calendar, Tag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function MemoryDetail() {
  const { id } = useParams<{ id: string }>();
  const numericId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: memory, isLoading } = useGetMemory(numericId, {
    query: { enabled: !!numericId, queryKey: getGetMemoryQueryKey(numericId) }
  });

  const deleteMutation = useDeleteMemory();
  const favoriteMutation = useToggleFavorite();

  const handleDelete = () => {
    deleteMutation.mutate({ id: numericId }, {
      onSuccess: () => {
        toast({ title: "Memory deleted" });
        queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
        setLocation("/gallery");
      }
    });
  };

  const handleFavorite = () => {
    favoriteMutation.mutate({ id: numericId }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetMemoryQueryKey(numericId), updated);
        queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
      }
    });
  };

  if (isLoading) return <Layout><div className="animate-pulse h-[60vh] bg-muted/20 rounded-xl" /></Layout>;
  if (!memory) return <Layout><div className="text-center py-20 font-serif">Memory not found.</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <Link href="/gallery" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Gallery
        </Link>
        
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center border border-border/40 shadow-2xl">
            <img 
              src={memory.fileUrl} 
              alt={memory.title} 
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
          
          <div className="flex flex-col py-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-4xl font-serif leading-tight">{memory.title}</h1>
              <Button variant="ghost" size="icon" onClick={handleFavorite} className="shrink-0 rounded-full">
                <Heart className={`w-6 h-6 ${memory.isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-8">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(memory.date), "MMMM d, yyyy")}
              </div>
              {memory.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {memory.location}
                </div>
              )}
            </div>

            {memory.description && (
              <div className="prose prose-invert prose-p:text-foreground/80 font-serif mb-8">
                <p className="whitespace-pre-wrap leading-relaxed text-lg italic border-l-2 border-primary/40 pl-4">{memory.description}</p>
              </div>
            )}

            {memory.tags && memory.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-12">
                <Tag className="w-4 h-4 text-muted-foreground mt-1" />
                {memory.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto pt-8 border-t border-border/40 flex items-center gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="bg-destructive/20 text-destructive hover:bg-destructive hover:text-white">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border/40">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-serif">Delete this memory?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the photo and its story from your vault.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">Delete Permanently</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
