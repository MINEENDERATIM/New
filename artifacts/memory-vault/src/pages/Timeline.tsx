import { Layout } from "@/components/Layout";
import { useGetTimeline } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import { Calendar } from "lucide-react";

export default function Timeline() {
  const { data: timeline, isLoading } = useGetTimeline();

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-primary opacity-80" />
          <h1 className="text-4xl font-serif mb-2">Our Timeline</h1>
          <p className="text-muted-foreground font-serif italic">Every moment, in its perfect place.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !timeline?.length ? (
          <p className="text-center text-muted-foreground font-serif">No memories logged in the timeline yet.</p>
        ) : (
          <div className="space-y-12">
            {timeline.map((yearGroup) => (
              <div key={yearGroup.year} className="relative pl-8 border-l border-border/40">
                <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary/20 border border-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <h2 className="text-3xl font-serif text-primary mb-6 -mt-1">{yearGroup.year} <span className="text-sm text-muted-foreground ml-2">({yearGroup.count} memories)</span></h2>
                
                <Accordion type="multiple" className="space-y-4">
                  {yearGroup.months.map((monthGroup) => (
                    <AccordionItem key={monthGroup.month} value={`${yearGroup.year}-${monthGroup.month}`} className="bg-card border border-border/40 rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline font-serif text-xl py-4">
                        {monthGroup.monthName} <span className="text-sm text-muted-foreground ml-auto mr-4">{monthGroup.count} items</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-2 pb-6 space-y-8">
                          {monthGroup.days.map((dayGroup) => (
                            <div key={dayGroup.date}>
                              <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                                {format(new Date(dayGroup.date), "EEEE, MMMM d")}
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {dayGroup.memories.map((memory) => (
                                  <Link key={memory.id} href={`/memory/${memory.id}`}>
                                    <a className="group block aspect-square rounded-md overflow-hidden relative border border-border/20">
                                      <img 
                                        src={memory.fileUrl} 
                                        alt={memory.title} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2 text-center">
                                        <span className="text-white font-serif text-sm line-clamp-2">{memory.title}</span>
                                      </div>
                                    </a>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
