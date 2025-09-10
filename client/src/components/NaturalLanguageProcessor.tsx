import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface NaturalLanguageProcessorProps {
  uploadId: string;
  sheetName: string;
  onCodeGenerated: (result: any) => void;
}

const quickCommands = [
  { label: "Filter rows", command: "remove rows where Status equals \"Closed\"" },
  { label: "Add column", command: "add column Priority where Priority = \"High\" if Amount > 1000 else \"Low\"" },
  { label: "Group by", command: "group by Region and sum Amount into TotalAmount" },
  { label: "Fill missing", command: "fill empty Email cells with \"unknown@example.com\"" },
];

export function NaturalLanguageProcessor({ uploadId, sheetName, onCodeGenerated }: NaturalLanguageProcessorProps) {
  const [nlInstruction, setNlInstruction] = useState("remove rows where Status equals Closed and Date before 2023-01-01");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateCode = async () => {
    if (!nlInstruction.trim()) {
      toast({
        title: "Missing instruction",
        description: "Please enter a natural language instruction.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", "/api/generate-code", {
        uploadId,
        sheetName,
        nlInstruction: nlInstruction.trim(),
      });

      const result = await response.json();
      onCodeGenerated(result);
      
      toast({
        title: "Code generated successfully",
        description: `Generated with ${result.confidence} confidence.`,
      });
    } catch (error) {
      console.error("Code generation error:", error);
      toast({
        title: "Code generation failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickCommand = (command: string) => {
    setNlInstruction(command);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Natural Language Command</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="nl-instruction" className="block text-sm font-medium text-foreground mb-2">
              Describe what you want to do:
            </Label>
            <Textarea
              id="nl-instruction"
              value={nlInstruction}
              onChange={(e) => setNlInstruction(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
              rows={3}
              placeholder="e.g., remove rows where Status equals Closed and Date before 2023-01-01"
              disabled={isGenerating}
              data-testid="textarea-nl-instruction"
            />
          </div>
          
          {/* Quick Commands */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Quick commands:</p>
            <div className="flex flex-wrap gap-2">
              {quickCommands.map((item) => (
                <Button
                  key={item.label}
                  variant="secondary"
                  size="sm"
                  className="px-3 py-1 text-xs bg-muted text-muted-foreground rounded-md hover:bg-accent transition-colors"
                  onClick={() => handleQuickCommand(item.command)}
                  disabled={isGenerating}
                  data-testid={`button-quick-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium hover:bg-primary/90 transition-colors"
            onClick={handleGenerateCode}
            disabled={isGenerating || !nlInstruction.trim()}
            data-testid="button-generate-code"
          >
            {isGenerating ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="fas fa-magic mr-2"></i>
                Generate Code
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
