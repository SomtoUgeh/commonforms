import { useCallback, useState } from "react";
import { toast } from "sonner";
import { validatePdfFile } from "@/utils/validation";

/**
 * Hook for managing file upload state and validation
 */
export function useFileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);

    const error = validatePdfFile(file);
    setValidationError(error);

    if (error && file) {
      toast.error(error);
    }
  }, []);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
  }, []);

  const isValid = selectedFile !== null && validationError === null;

  return {
    selectedFile,
    validationError,
    isValid,
    handleFileSelect,
    clearFile,
  };
}
