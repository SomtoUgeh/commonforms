import { Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDownloadUrl } from "@/lib/api/client";
import { useHistory } from "@/lib/store/history";
import { useSettings } from "@/lib/store/settings";
import { formatDuration, formatRelativeTime } from "@/utils/format";

const JOB_ID_PREVIEW_LENGTH = 8;

export function JobHistory() {
  const { jobs, removeJob, clearHistory } = useHistory();
  const { backendUrl } = useSettings();

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground text-sm">No completed jobs</p>
      </div>
    );
  }

  const handleDownload = (jobId: string) => {
    const url = getDownloadUrl(jobId, backendUrl);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={clearHistory} size="sm" variant="outline">
          Clear History
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((entry) => (
              <TableRow key={entry.job.job_id}>
                <TableCell className="font-mono text-xs">
                  {entry.job.job_id.slice(0, JOB_ID_PREVIEW_LENGTH)}...
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      entry.job.status === "ready" ? "default" : "destructive"
                    }
                  >
                    {entry.job.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDuration(entry.duration)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatRelativeTime(entry.completedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {entry.job.status === "ready" && (
                      <Button
                        onClick={() => handleDownload(entry.job.job_id)}
                        size="sm"
                        variant="ghost"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => removeJob(entry.job.job_id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
