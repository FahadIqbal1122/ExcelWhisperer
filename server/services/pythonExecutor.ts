import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { createDownloadBuffer } from './fileProcessor';

export interface ExecutionResult {
  success: boolean;
  data?: any[];
  summary?: {
    originalRowCount: number;
    resultRowCount: number;
    rowsAffected: number;
    preview: any[];
  };
  error?: string;
  executionTime: number;
}

export async function executePandasCode(
  code: string,
  inputData: any[],
  parameters: Record<string, any> = {}
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const tempDir = '/tmp';
  const executionId = randomUUID();
  const inputFile = join(tempDir, `input_${executionId}.json`);
  const outputFile = join(tempDir, `output_${executionId}.json`);
  const scriptFile = join(tempDir, `script_${executionId}.py`);

  try {
    // Prepare input data
    await fs.writeFile(inputFile, JSON.stringify({
      data: inputData,
      parameters
    }));

    // Create Python script with safety restrictions
    const pythonScript = `
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Security: Restrict only dangerous imports instead of whitelisting everything
import builtins
original_import = builtins.__import__

def restricted_import(name, *args, **kwargs):
    # Blacklist dangerous modules instead of whitelisting
    dangerous_modules = {
        'os', 'sys', 'subprocess', 'shutil', 'socket', 'threading', 
        'multiprocessing', 'ctypes', 'mmap', 'fcntl', 'resource',
        'signal', 'pwd', 'grp', 'termios', 'pty', 'posix', 'winreg',
        'msvcrt', '_winapi', 'win32api', 'win32con', 'win32security'
    }
    
    module_base = name.split('.')[0]
    if module_base in dangerous_modules:
        raise ImportError(f"Module '{name}' is not allowed for security reasons")
    
    return original_import(name, *args, **kwargs)

builtins.__import__ = restricted_import

try:
    # Load input data
    with open('${inputFile}', 'r') as f:
        input_data = json.load(f)
    
    df = pd.DataFrame(input_data['data'])
    parameters = input_data['parameters']
    original_row_count = len(df)
    
    # User code execution
${code.split('\n').map(line => '    ' + line).join('\n')}
    
    # Execute transformation
    result_df = transform_data(df)
    
    if not isinstance(result_df, pd.DataFrame):
        raise ValueError("transform_data must return a pandas DataFrame")
    
    result_row_count = len(result_df)
    rows_affected = abs(original_row_count - result_row_count)
    
    # Convert result to JSON-serializable format
    result_data = result_df.where(pd.notnull(result_df), None).to_dict('records')
    preview_data = result_data[:10] if len(result_data) > 10 else result_data
    
    # Prepare output
    output = {
        'success': True,
        'data': result_data,
        'summary': {
            'originalRowCount': original_row_count,
            'resultRowCount': result_row_count,
            'rowsAffected': rows_affected,
            'preview': preview_data
        }
    }
    
    with open('${outputFile}', 'w') as f:
        json.dump(output, f, default=str)
        
except Exception as e:
    error_output = {
        'success': False,
        'error': str(e)
    }
    with open('${outputFile}', 'w') as f:
        json.dump(error_output, f)
`;

    await fs.writeFile(scriptFile, pythonScript);

    // Execute Python script with timeout and resource limits
    const result = await new Promise<ExecutionResult>((resolve, reject) => {
      const python = spawn('/usr/bin/python3', [scriptFile], {
        cwd: tempDir,
        timeout: 30000, // 30 second timeout
        env: {
          ...process.env,
          PYTHONPATH: '',
          PATH: '/usr/bin:/bin' // Restrict PATH
        }
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', async (code) => {
        try {
          const executionTime = Date.now() - startTime;

          if (code !== 0) {
            resolve({
              success: false,
              error: stderr || 'Python execution failed',
              executionTime
            });
            return;
          }

          // Read output
          const outputContent = await fs.readFile(outputFile, 'utf-8');
          const output = JSON.parse(outputContent);

          resolve({
            ...output,
            executionTime
          });
        } catch (error) {
          resolve({
            success: false,
            error: `Failed to process execution result: ${(error as Error).message}`,
            executionTime: Date.now() - startTime
          });
        }
      });

      python.on('error', (error) => {
        resolve({
          success: false,
          error: `Python execution error: ${error.message}`,
          executionTime: Date.now() - startTime
        });
      });
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Execution setup error: ${(error as Error).message}`,
      executionTime: Date.now() - startTime
    };
  } finally {
    // Cleanup temporary files
    try {
      await Promise.all([
        fs.unlink(inputFile).catch(() => { }),
        fs.unlink(outputFile).catch(() => { }),
        fs.unlink(scriptFile).catch(() => { })
      ]);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}
