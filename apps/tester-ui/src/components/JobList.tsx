import { useState } from "react";
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
  const { backendUrl } = useSettings();
  const { addJob } = useHistory();
  const [startTime] = useState(Date.now());

  const { data: job } = useJobStatus(jobId, backendUrl);

  // Add to history when job completes
  useState(() => {
    if (job && (job.status === "ready" || job.status === "failed")) {
      const duration = Date.now() - startTime;
      addJob(job, duration);
    }
  });

  if (!job) {
    return null;
  }

  return <JobCard job={job} onRemove={onRemove} />;
}
