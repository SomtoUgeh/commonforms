import { FileText, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFileUpload } from "@/hooks/useFileUpload";
import type { JobOptions } from "@/lib/api/schemas";
import { useCreateJob } from "@/lib/query/hooks";
import { useSettings } from "@/lib/store/settings";
import { formatFileSize } from "@/utils/format";

type JobUploaderProps = {
  onJobCreated?: (jobId: string) => void;
};

export function JobUploader({ onJobCreated }: JobUploaderProps) {
  const { backendUrl } = useSettings();
  const { selectedFile, isValid, handleFileSelect, clearFile } =
    useFileUpload();
  const createJobMutation = useCreateJob();

  const [model, setModel] = useState<"FFDNet-S" | "FFDNet-L">("FFDNet-S");
  const [fast, setFast] = useState(true);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleFileSelect(acceptedFiles[0]);
      }
    },
    [handleFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: createJobMutation.isPending,
  });

  const handleSubmit = async () => {
    if (!(selectedFile && isValid)) {
      return;
    }

    const options: JobOptions = {
      model_or_path: model,
      fast,
    };

    try {
      const result = await createJobMutation.mutateAsync({
        file: selectedFile,
        options,
        baseUrl: backendUrl,
      });

      toast.success(`Job created: ${result.job_id}`);
      clearFile();
      onJobCreated?.(result.job_id);
    } catch (error) {
      toast.error(
        `Failed to create job: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
              ${createJobMutation.isPending ? "cursor-not-allowed opacity-50" : "hover:border-primary/50"}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-sm">
                {isDragActive
                  ? "Drop PDF here"
                  : "Drag & drop PDF or click to browse"}
              </p>
              <p className="text-muted-foreground text-xs">
                Maximum file size: 50 MB
              </p>
            </div>
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <Button onClick={clearFile} size="sm" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                onValueChange={(value) => setModel(value as typeof model)}
                value={model}
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FFDNet-S">
                    FFDNet-S (Small, 19 MB)
                  </SelectItem>
                  <SelectItem value="FFDNet-L">
                    FFDNet-L (Large, 51 MB)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select
                onValueChange={(value) => setFast(value === "fast")}
                value={fast ? "fast" : "normal"}
              >
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Fast (ONNX, ~2x faster)</SelectItem>
                  <SelectItem value="normal">Normal (PyTorch)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full"
            disabled={!isValid || createJobMutation.isPending}
            onClick={handleSubmit}
            size="lg"
          >
            {createJobMutation.isPending ? "Uploading..." : "Process PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
