import * as XLSX from 'xlsx';
import { PassThrough } from 'stream';

export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: Array<{
    name: string;
    type: string;
    index: number;
  }>;
  preview: Array<Record<string, any>>;
}

export interface ProcessedFile {
  sheets: SheetInfo[];
  filename: string;
  fileSize: number;
}

export function inferColumnType(values: any[]): string {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonNullValues.length === 0) return 'text';
  
  // Check for numbers
  const numericCount = nonNullValues.filter(v => 
    typeof v === 'number' || (!isNaN(Number(v)) && !isNaN(parseFloat(v)))
  ).length;
  
  if (numericCount / nonNullValues.length > 0.8) {
    return 'number';
  }
  
  // Check for dates
  const dateCount = nonNullValues.filter(v => {
    if (v instanceof Date) return true;
    if (typeof v === 'string') {
      const parsed = new Date(v);
      return !isNaN(parsed.getTime()) && v.match(/\d{2,4}[-\/]\d{1,2}[-\/]\d{1,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/);
    }
    return false;
  }).length;
  
  if (dateCount / nonNullValues.length > 0.7) {
    return 'date';
  }
  
  // Check for currency
  const currencyCount = nonNullValues.filter(v => 
    typeof v === 'string' && v.match(/^\$?\d+\.?\d*$|^\d+\.?\d*\$?$/)
  ).length;
  
  if (currencyCount / nonNullValues.length > 0.8) {
    return 'currency';
  }
  
  // Check for boolean
  const booleanCount = nonNullValues.filter(v => 
    typeof v === 'boolean' || 
    (typeof v === 'string' && ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase()))
  ).length;
  
  if (booleanCount / nonNullValues.length > 0.8) {
    return 'boolean';
  }
  
  // Check for categories (limited unique values)
  const uniqueValues = new Set(nonNullValues);
  if (uniqueValues.size <= Math.max(10, nonNullValues.length * 0.1)) {
    return 'category';
  }
  
  return 'text';
}

export async function processFile(fileBuffer: Buffer, filename: string): Promise<ProcessedFile> {
  try {
    let workbook: XLSX.WorkBook;
    
    if (filename.toLowerCase().endsWith('.csv')) {
      const csvData = fileBuffer.toString('utf-8');
      workbook = XLSX.read(csvData, { type: 'string' });
    } else {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    }
    
    const sheets: SheetInfo[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) continue;
      
      const headerRow = jsonData[0] as any[];
      const dataRows = jsonData.slice(1) as any[][];
      
      if (!headerRow || headerRow.length === 0) continue;
      
      // Clean and process headers
      const cleanHeaders = headerRow.map((header, index) => 
        header && header.toString().trim() || `Column_${index + 1}`
      );
      
      // Get preview data (first 100 rows)
      const previewRows = dataRows.slice(0, 100);
      const preview = previewRows.map(row => {
        const obj: Record<string, any> = {};
        cleanHeaders.forEach((header, index) => {
          obj[header] = row[index] || null;
        });
        return obj;
      });
      
      // Infer column types
      const columns = cleanHeaders.map((header, index) => {
        const columnValues = dataRows.map(row => row[index]).slice(0, 1000); // Sample first 1000 rows
        const type = inferColumnType(columnValues);
        
        return {
          name: header,
          type,
          index
        };
      });
      
      sheets.push({
        name: sheetName,
        rowCount: dataRows.length,
        columnCount: cleanHeaders.length,
        columns,
        preview
      });
    }
    
    return {
      sheets,
      filename,
      fileSize: fileBuffer.length
    };
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error(`Failed to process file: ${(error as Error).message}`);
  }
}

export function createDownloadBuffer(data: any[], format: 'xlsx' | 'csv'): Buffer {
  if (format === 'csv') {
    if (data.length === 0) return Buffer.from('');
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          // Escape CSV values that contain commas, quotes, or newlines
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');
    
    return Buffer.from(csvContent, 'utf-8');
  } else {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}
