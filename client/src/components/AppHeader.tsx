import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

export function AppHeader() {
  const [showActivityLog, setShowActivityLog] = useState(false);

  const { data: recentRuns = [] } = useQuery({
    queryKey: ["/api/runs"],
    enabled: showActivityLog,
  }) as { data: any[] };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-primary text-primary-foreground w-10 h-10 rounded-lg flex items-center justify-center">
              <i className="fas fa-table text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground" data-testid="app-title">DataFlow</h1>
              <p className="text-xs text-muted-foreground">Natural Language Data Processing</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Sheet open={showActivityLog} onOpenChange={setShowActivityLog}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-activity-log">
                  <i className="fas fa-history"></i>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-96">
                <SheetHeader>
                  <SheetTitle>Activity Log</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4 overflow-y-auto h-full">
                  {recentRuns.map((run: any) => (
                    <div key={run.id} className={`border-l-4 pl-4 ${
                      run.status === 'completed' ? 'border-primary' : 
                      run.status === 'failed' ? 'border-destructive' : 'border-yellow-500'
                    }`} data-testid={`activity-item-${run.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {run.playbookId ? 'Playbook Run' : 'Data Transform'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {run.nlInstruction}
                      </p>
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          run.status === 'completed' ? 'bg-green-100 text-green-800' :
                          run.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {recentRuns.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <i className="fas fa-clock text-2xl mb-2"></i>
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            
            <Button variant="ghost" size="sm" data-testid="button-help">
              <i className="fas fa-book"></i>
            </Button>
            
            <Button size="sm" data-testid="button-sign-in">
              <i className="fas fa-user mr-2"></i>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
