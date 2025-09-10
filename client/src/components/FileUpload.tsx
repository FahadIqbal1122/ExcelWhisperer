import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onUploadSuccess: (uploadId: string) => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    setUploading(true);
    setCurrentFile(file);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      
      toast({
        title: "Upload successful",
        description: `${file.name} has been processed successfully.`,
      });

      onUploadSuccess(result.uploadId);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setCurrentFile(null);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upload File</CardTitle>
          <span className="text-sm text-muted-foreground">Max 10MB • XLSX, CSV</span>
        </div>
      </CardHeader>
      <CardContent>
        {!uploading ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary hover:bg-primary/2'
            }`}
            data-testid="upload-dropzone"
          >
            <input {...getInputProps()} data-testid="file-input" />
            <div className="space-y-4">
              <div className="text-muted-foreground">
                <i className="fas fa-cloud-upload-alt text-4xl mb-3"></i>
              </div>
              <div>
                <p className="text-foreground font-medium">
                  {isDragActive ? 'Drop your file here' : 'Drop your Excel or CSV file here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
              <Button type="button" data-testid="button-choose-file">
                Choose File
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4" data-testid="upload-progress">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{currentFile?.name}</span>
              <span className="text-muted-foreground">
                {Math.round((currentFile?.size || 0) * uploadProgress / 100 / 1024 / 1024 * 10) / 10}MB of{' '}
                {Math.round((currentFile?.size || 0) / 1024 / 1024 * 10) / 10}MB
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" data-testid="progress-bar" />
            <div className="text-center text-sm text-muted-foreground">
              {uploadProgress < 100 ? 'Uploading...' : 'Processing file...'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
