import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { JobHistory } from "@/components/JobHistory";
import { JobList } from "@/components/JobList";
import { JobUploader } from "@/components/JobUploader";
import { Container, Header } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient } from "@/lib/query/client";

function App() {
  const [activeJobIds, setActiveJobIds] = useState<string[]>([]);

  const handleJobCreated = (jobId: string) => {
    setActiveJobIds((prev) => [jobId, ...prev]);
  };

  const handleRemoveJob = (jobId: string) => {
    setActiveJobIds((prev) => prev.filter((id) => id !== jobId));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Header />

        <Container>
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Upload Section */}
            <section>
              <h2 className="mb-4 font-semibold text-lg">Upload PDF</h2>
              <JobUploader onJobCreated={handleJobCreated} />
            </section>

            {/* Jobs Section */}
            <section>
              <Tabs defaultValue="active">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">
                    Active Jobs{" "}
                    {activeJobIds.length > 0 && `(${activeJobIds.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent className="mt-6" value="active">
                  <JobList
                    activeJobIds={activeJobIds}
                    onRemoveJob={handleRemoveJob}
                  />
                </TabsContent>

                <TabsContent className="mt-6" value="history">
                  <JobHistory />
                </TabsContent>
              </Tabs>
            </section>
          </div>
        </Container>
      </div>

      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
