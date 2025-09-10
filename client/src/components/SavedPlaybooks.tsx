import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SavedPlaybooksProps {
  uploadId: string;
  sheetName: string;
  onPlaybookRun: (result: any) => void;
}

export function SavedPlaybooks({ uploadId, sheetName, onPlaybookRun }: SavedPlaybooksProps) {
  const { toast } = useToast();
  
  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ["/api/playbooks"],
  }) as { data: any[], isLoading: boolean };

  const handleRunPlaybook = async (playbook: any) => {
    if (!uploadId || !sheetName) {
      toast({
        title: "No data selected",
        description: "Please upload a file and select a sheet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Simple parameter mapping - in production, this would be more sophisticated
      const parameterMapping: Record<string, any> = {};
      
      // For now, use default values from the playbook parameters
      playbook.parameters?.forEach((param: any) => {
        parameterMapping[param.name] = param.defaultValue;
      });

      const response = await apiRequest("POST", `/api/playbooks/${playbook.id}/run`, {
        uploadId,
        sheetName,
        parameterMapping
      });

      const result = await response.json();
      onPlaybookRun(result);
      
      if (result.success) {
        toast({
          title: "Playbook executed successfully",
          description: `"${playbook.name}" completed processing.`,
        });
      } else {
        toast({
          title: "Playbook execution failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Playbook execution error:", error);
      toast({
        title: "Execution failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Saved Playbooks</CardTitle>
          <Button variant="link" className="text-primary hover:underline text-sm p-0" data-testid="button-view-all-playbooks">
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : playbooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <i className="fas fa-bookmark text-2xl mb-2"></i>
            <p>No saved playbooks yet</p>
            <p className="text-sm">Create transformations to build your playbook library</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playbooks.slice(0, 3).map((playbook: any) => (
              <div key={playbook.id} className="border border-border rounded-lg p-3" data-testid={`playbook-${playbook.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{playbook.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {playbook.description || playbook.nlInstruction}
                    </p>
                  </div>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-accent px-2 py-1 rounded text-xs ml-2"
                    onClick={() => handleRunPlaybook(playbook)}
                    disabled={!uploadId || !sheetName}
                    data-testid={`button-run-playbook-${playbook.id}`}
                  >
                    <i className="fas fa-play"></i>
                  </Button>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {playbook.parameters?.length || 0} params
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Used {playbook.usageCount || 0} times
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
