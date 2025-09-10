import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface DataPreviewProps {
  uploadId: string;
  sheetName: string;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'number': return 'fas fa-hashtag';
    case 'date': return 'fas fa-calendar';
    case 'currency': return 'fas fa-dollar-sign';
    case 'boolean': return 'fas fa-toggle-on';
    case 'category': return 'fas fa-tag';
    default: return 'fas fa-font';
  }
};

const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'number': return 'bg-blue-100 text-blue-800';
    case 'date': return 'bg-green-100 text-green-800';
    case 'currency': return 'bg-orange-100 text-orange-800';
    case 'boolean': return 'bg-purple-100 text-purple-800';
    case 'category': return 'bg-gray-100 text-gray-800';
    default: return 'bg-slate-100 text-slate-800';
  }
};

export function DataPreview({ uploadId, sheetName }: DataPreviewProps) {
  const [showAllColumns, setShowAllColumns] = useState(false);
  
  const { data: sheetData, isLoading } = useQuery({
    queryKey: ["/api/upload", uploadId, "sheet", sheetName],
    enabled: !!uploadId && !!sheetName,
  }) as { data: any, isLoading: boolean };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Preview</CardTitle>
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 mb-4" />
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!sheetData) {
    return null;
  }

  const { columns, preview, rowCount } = sheetData;
  const displayColumns = showAllColumns ? columns : columns.slice(0, 6);
  const displayPreview = preview.slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Data Preview</CardTitle>
          <span className="text-sm text-muted-foreground">First 100 rows</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Data Type Inference */}
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <i className="fas fa-magic text-primary text-sm"></i>
            <span className="text-sm font-medium text-foreground">Auto-detected columns</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayColumns.map((column: any) => (
              <Badge
                key={column.name}
                className={`inline-flex items-center px-2 py-1 rounded text-xs ${getTypeBadgeColor(column.type)}`}
                data-testid={`column-badge-${column.name}`}
              >
                <i className={`${getTypeIcon(column.type)} mr-1`}></i>
                {column.name} ({column.type})
              </Badge>
            ))}
            {!showAllColumns && columns.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{columns.length - 6} more
              </Badge>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                {displayColumns.map((column: any) => (
                  <TableHead 
                    key={column.name}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0"
                    data-testid={`column-header-${column.name}`}
                  >
                    {column.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPreview.map((row: any, index: number) => (
                <TableRow key={index} data-testid={`preview-row-${index}`}>
                  {displayColumns.map((column: any) => (
                    <TableCell 
                      key={column.name}
                      className="px-4 py-3 text-sm text-foreground border-r border-border border-b last:border-r-0"
                    >
                      {column.name === 'Status' && row[column.name] ? (
                        <Badge 
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            row[column.name] === 'Completed' ? 'bg-green-100 text-green-800' :
                            row[column.name] === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {row[column.name]}
                        </Badge>
                      ) : (
                        <span data-testid={`cell-${index}-${column.name}`}>
                          {row[column.name] || ''}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {displayPreview.length} of {rowCount.toLocaleString()} rows</span>
          {columns.length > 6 && (
            <Button 
              variant="link" 
              className="text-primary hover:underline p-0"
              onClick={() => setShowAllColumns(!showAllColumns)}
              data-testid="button-toggle-columns"
            >
              {showAllColumns ? 'Show fewer columns' : 'View all columns'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
