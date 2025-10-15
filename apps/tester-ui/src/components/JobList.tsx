import { useEffect, useState } from "react";
import { JobCard } from "@/components/JobCard";
import { useJobStatus } from "@/lib/query/hooks";
import { useHistory } from "@/lib/store/history";
import { useSettings } from "@/lib/store/settings";

type JobListProps = {
  activeJobIds: string[];
  onRemoveJob: (jobId: string) => void;
};

export function JobList({ activeJobIds, onRemoveJob }: JobListProps) {
  if (activeJobIds.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground text-sm">No active jobs</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeJobIds.map((jobId) => (
        <JobMonitor
          jobId={jobId}
          key={jobId}
          onRemove={() => onRemoveJob(jobId)}
        />
      ))}
    </div>
  );
}

/**
 * Monitors a single job and adds it to history when complete
 */
function JobMonitor({
  jobId,
  onRemove,
}: {
  jobId: string;
  onRemove: () => void;
}) {
  const { backendUrl, pollInterval } = useSettings();
  const { addJob } = useHistory();
  const [startTime] = useState(Date.now());

  const {
    data: job,
    isPending,
    isError,
    error,
  } = useJobStatus(jobId, backendUrl, pollInterval);

  // Add to history when job completes
  useEffect(() => {
    if (job && (job.status === "ready" || job.status === "failed")) {
      const duration = Date.now() - startTime;
      addJob(job, duration);
    }
  }, [job, startTime, addJob]);

  if (!job) {
    if (isPending) {
      return (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Loading job status...</p>
          <p className="font-mono text-muted-foreground text-xs">{jobId}</p>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-8 text-center">
          <p className="text-destructive text-sm">
            Failed to load job status.{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <p className="font-mono text-destructive/80 text-xs">{jobId}</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">Loading job status...</p>
        <p className="font-mono text-muted-foreground text-xs">{jobId}</p>
      </div>
    );
  }

  return <JobCard job={job} onRemove={onRemove} />;
}
