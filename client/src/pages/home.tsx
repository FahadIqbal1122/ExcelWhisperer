import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FileUpload } from "@/components/FileUpload";
import { SheetSelection } from "@/components/SheetSelection";
import { DataPreview } from "@/components/DataPreview";
import { NaturalLanguageProcessor } from "@/components/NaturalLanguageProcessor";
import { GeneratedCode } from "@/components/GeneratedCode";
import { ExecutionResults } from "@/components/ExecutionResults";
import { SavedPlaybooks } from "@/components/SavedPlaybooks";

export default function Home() {
  const [uploadId, setUploadId] = useState<string>("");
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [generatedCode, setGeneratedCode] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Preview */}
          <div className="lg:col-span-2 space-y-6">
            <FileUpload 
              onUploadSuccess={setUploadId}
              data-testid="file-upload-section"
            />
            
            {uploadId && (
              <SheetSelection 
                uploadId={uploadId}
                selectedSheet={selectedSheet}
                onSheetSelect={setSelectedSheet}
                data-testid="sheet-selection-section"
              />
            )}
            
            {uploadId && selectedSheet && (
              <DataPreview 
                uploadId={uploadId}
                sheetName={selectedSheet}
                data-testid="data-preview-section"
              />
            )}
          </div>

          {/* Right Column - NL Processing & Playbooks */}
          <div className="space-y-6">
            {uploadId && selectedSheet && (
              <NaturalLanguageProcessor 
                uploadId={uploadId}
                sheetName={selectedSheet}
                onCodeGenerated={setGeneratedCode}
                data-testid="nl-processor-section"
              />
            )}
            
            {generatedCode && (
              <GeneratedCode 
                codeResult={generatedCode}
                uploadId={uploadId}
                sheetName={selectedSheet}
                onExecutionComplete={setExecutionResult}
                data-testid="generated-code-section"
              />
            )}
            
            {executionResult && (
              <ExecutionResults 
                result={executionResult}
                data-testid="execution-results-section"
              />
            )}
            
            <SavedPlaybooks 
              uploadId={uploadId}
              sheetName={selectedSheet}
              onPlaybookRun={setExecutionResult}
              data-testid="saved-playbooks-section"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
