import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExecutionResultsProps {
  result: any;
}

export function ExecutionResults({ result }: ExecutionResultsProps) {
  const handleDownload = (format: 'xlsx' | 'csv') => {
    if (result.downloadUrl) {
      const url = `${result.downloadUrl}?format=${format}`;
      window.open(url, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Execution Results</CardTitle>
          <Badge className={`text-xs px-2 py-1 rounded ${
            result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {result.success ? 'Success' : 'Failed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {result.success ? (
          <>
            {/* Results Summary */}
            {result.summary && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground" data-testid="result-row-count">
                    {result.summary.resultRowCount?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Rows remaining</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground" data-testid="result-rows-affected">
                    {result.summary.rowsAffected?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Rows affected</p>
                </div>
              </div>
            )}

            {/* Sample Results */}
            {result.summary?.preview && result.summary.preview.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden mb-4">
                <div className="bg-muted px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground">Sample Results (first 3 rows)</p>
                </div>
                <div className="p-3 space-y-2 text-sm">
                  {result.summary.preview.slice(0, 3).map((row: any, index: number) => {
                    const displayText = Object.values(row).slice(0, 3).join(' | ');
                    return (
                      <div key={index} className="flex justify-between" data-testid={`result-preview-row-${index}`}>
                        <span className="text-muted-foreground truncate">{displayText}</span>
                        <span className="text-green-600">✓ Processed</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Download Options */}
            <div className="space-y-2">
              <Button 
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 transition-colors"
                onClick={() => handleDownload('xlsx')}
                disabled={!result.downloadUrl}
                data-testid="button-download-xlsx"
              >
                <i className="fas fa-download mr-2"></i>
                Download as XLSX
              </Button>
              <Button 
                variant="outline"
                className="w-full border border-border py-2 px-4 rounded-md font-medium hover:bg-accent transition-colors"
                onClick={() => handleDownload('csv')}
                disabled={!result.downloadUrl}
                data-testid="button-download-csv"
              >
                <i className="fas fa-file-csv mr-2"></i>
                Download as CSV
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <i className="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
              <p className="font-medium text-red-800 mb-1">Execution Failed</p>
              <p className="text-sm text-red-600" data-testid="error-message">
                {result.error || 'An unknown error occurred'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
