import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface SheetSelectionProps {
  uploadId: string;
  selectedSheet: string;
  onSheetSelect: (sheetName: string) => void;
}

export function SheetSelection({ uploadId, selectedSheet, onSheetSelect }: SheetSelectionProps) {
  const { data: uploadData, isLoading } = useQuery({
    queryKey: ["/api/upload", uploadId],
    enabled: !!uploadId,
  }) as { data: any, isLoading: boolean };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sheets = uploadData?.sheets || [];

  if (sheets.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Sheet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sheets.map((sheet: any) => (
            <Button
              key={sheet.name}
              variant={selectedSheet === sheet.name ? "default" : "outline"}
              className={`p-4 h-auto text-left justify-start ${
                selectedSheet === sheet.name 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onSheetSelect(sheet.name)}
              data-testid={`sheet-button-${sheet.name}`}
            >
              <div className="flex items-center space-x-3 w-full">
                <i className={`fas fa-table ${
                  selectedSheet === sheet.name ? 'text-primary' : 'text-muted-foreground'
                }`}></i>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{sheet.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {sheet.rowCount.toLocaleString()} rows • {sheet.columnCount} cols
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
