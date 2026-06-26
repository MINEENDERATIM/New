import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getListMemoriesQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !date) {
      toast({ title: "Missing fields", description: "Please provide an image, title, and date.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("date", date);
      if (description) formData.append("description", description);
      if (locationStr) formData.append("location", locationStr);
      if (tags) formData.append("tags", tags);

      const res = await fetch("/api/memories", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      
      toast({ title: "Memory added", description: "Successfully added to your vault." });
      setLocation("/gallery");
    } catch (err) {
      toast({ title: "Upload error", description: String(err), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-serif mb-8">Add a Memory</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Image Upload Area */}
          <div className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center bg-card hover:bg-muted/10 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
              id="file-upload" 
            />
            <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              {preview ? (
                <div className="relative w-full aspect-video sm:aspect-[21/9] overflow-hidden rounded-md">
                  <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Change Image</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <UploadCloud className="w-8 h-8 text-primary" />
                  </div>
                  <span className="text-lg font-medium">Click to select an image</span>
                  <span className="text-sm text-muted-foreground mt-1">PNG, JPG up to 10MB</span>
                </div>
              )}
            </Label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="A beautiful afternoon..." required className="bg-background/50" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required className="bg-background/50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={locationStr} onChange={e => setLocationStr(e.target.value)} placeholder="Paris, France" className="bg-background/50" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Story / Description</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Write down what you remember about this moment..." className="min-h-[120px] bg-background/50" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="vacation, summer, us (comma separated)" className="bg-background/50" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isUploading || !file || !title} size="lg" className="w-full sm:w-auto font-serif px-8">
              {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Memory"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
