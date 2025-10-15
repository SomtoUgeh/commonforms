import { Download, Trash2 } from "lucide-react";
import { JobProgress } from "@/components/JobProgress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useJobMetrics } from "@/hooks/useJobMetrics";
import { getDownloadUrl } from "@/lib/api/client";
import type { JobStatusResponse } from "@/lib/api/schemas";
import { useSettings } from "@/lib/store/settings";
import { estimateTimeRemaining, formatDuration } from "@/utils/format";

type JobCardProps = {
  job: JobStatusResponse;
  onRemove?: () => void;
};

export function JobCard({ job, onRemove }: JobCardProps) {
  const { backendUrl } = useSettings();
  const metrics = useJobMetrics(job);
  const isComplete = job.status === "ready";
  const isFailed = job.status === "failed";

  const timeRemaining = estimateTimeRemaining(job.progress, metrics.elapsedMs);

  const handleDownload = () => {
    const url = getDownloadUrl(job.job_id, backendUrl);
    window.open(url, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="font-mono text-sm">{job.job_id}</CardTitle>
            <CardDescription>
              {metrics.isComplete
                ? `Completed in ${formatDuration(metrics.totalDuration || 0)}`
                : `Processing for ${formatDuration(metrics.elapsedMs)}`}
              {timeRemaining &&
                !metrics.isComplete &&
                ` • ~${formatDuration(timeRemaining)} remaining`}
            </CardDescription>
          </div>
          {onRemove && (
            <Button onClick={onRemove} size="sm" variant="ghost">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <JobProgress
          message={job.message}
          progress={job.progress}
          status={job.status}
        />

        {isFailed && job.error && (
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="font-medium text-destructive text-sm">
              {job.error.type}
            </p>
            {job.error.detail && (
              <p className="text-destructive/80 text-sm">{job.error.detail}</p>
            )}
          </div>
        )}

        {isComplete && (
          <Button className="w-full" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Result
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
