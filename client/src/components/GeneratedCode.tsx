import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface GeneratedCodeProps {
  codeResult: any;
  uploadId: string;
  sheetName: string;
  onExecutionComplete: (result: any) => void;
}

export function GeneratedCode({ codeResult, uploadId, sheetName, onExecutionComplete }: GeneratedCodeProps) {
  const [parameters, setParameters] = useState<Record<string, any>>(() => {
    const initialParams: Record<string, any> = {};
    codeResult.parameters?.forEach((param: any) => {
      initialParams[param.name] = param.defaultValue;
    });
    return initialParams;
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    try {
      const response = await apiRequest("POST", "/api/run", {
        uploadId,
        sheetName,
        code: codeResult.code,
        parameters,
        nlInstruction: "Generated code execution" // This should come from the original NL instruction
      });

      const result = await response.json();
      onExecutionComplete(result);
      
      if (result.success) {
        toast({
          title: "Code executed successfully",
          description: `Processed ${result.summary?.resultRowCount || 0} rows.`,
        });
      } else {
        toast({
          title: "Execution failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Execution error:", error);
      toast({
        title: "Execution failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSavePlaybook = async () => {
    setIsSaving(true);
    try {
      const name = prompt("Enter a name for this playbook:");
      if (!name) return;

      const description = prompt("Enter a description (optional):");

      await apiRequest("POST", "/api/playbooks", {
        name,
        description: description || "",
        nlInstruction: "Generated transformation", // This should come from the original NL instruction
        generatedCode: codeResult.code,
        parameters: codeResult.parameters || [],
        userId: undefined // Will be set from session when auth is implemented
      });

      toast({
        title: "Playbook saved",
        description: `"${name}" has been saved successfully.`,
      });
    } catch (error) {
      console.error("Save playbook error:", error);
      toast({
        title: "Failed to save playbook",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(codeResult.code);
      toast({
        title: "Code copied",
        description: "Code has been copied to clipboard.",
      });
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Failed to copy",
        description: "Could not copy code to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Generated Code</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={`text-xs px-2 py-1 rounded ${getConfidenceBadgeColor(codeResult.confidence)}`}>
              {codeResult.confidence} Confidence
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={copyToClipboard}
              data-testid="button-copy-code"
            >
              <i className="fas fa-copy"></i>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Code Display */}
        <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto mb-4">
          <pre className="whitespace-pre-wrap" data-testid="generated-code-display">
            {codeResult.code}
          </pre>
        </div>

        {/* Explanation */}
        {codeResult.explanation && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{codeResult.explanation}</p>
          </div>
        )}

        {/* Parameters */}
        {codeResult.parameters && codeResult.parameters.length > 0 && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2">Detected Parameters:</p>
            <div className="space-y-2">
              {codeResult.parameters.map((param: any) => (
                <div key={param.name} className="flex items-center justify-between">
                  <Label htmlFor={`param-${param.name}`} className="text-sm text-foreground">
                    {param.name}
                  </Label>
                  <Input
                    id={`param-${param.name}`}
                    type={param.type === 'number' ? 'number' : param.type === 'date' ? 'date' : 'text'}
                    value={parameters[param.name] || ''}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    className="text-xs px-2 py-1 border border-input rounded bg-background w-32"
                    data-testid={`input-param-${param.name}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button 
            className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium hover:bg-primary/90 transition-colors"
            onClick={handleRunCode}
            disabled={isExecuting}
            data-testid="button-run-code"
          >
            {isExecuting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Running...
              </>
            ) : (
              <>
                <i className="fas fa-play mr-2"></i>
                Run Code
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={handleSavePlaybook}
            disabled={isSaving}
            data-testid="button-save-playbook"
          >
            {isSaving ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-save"></i>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
