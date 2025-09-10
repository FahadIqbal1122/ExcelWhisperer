import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { randomUUID } from "crypto";
import { processFile, createDownloadBuffer } from "./services/fileProcessor";
import { generatePandasCode } from "./services/gemini";
import { executePandasCode } from "./services/pythonExecutor";
import { insertUploadSchema, insertPlaybookSchema, insertRunSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only XLSX and CSV files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload endpoint
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const { originalname, buffer, size, mimetype } = req.file;
      
      // Process the file
      const processedFile = await processFile(buffer, originalname);
      
      // Create upload record
      const uploadData = {
        filename: `${randomUUID()}_${originalname}`,
        originalName: originalname,
        fileSize: size,
        mimeType: mimetype,
        s3Key: `uploads/${randomUUID()}`, // In production, actually upload to S3
        sheets: processedFile.sheets,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        userId: undefined // TODO: Get from session when auth is implemented
      };

      const upload = await storage.createUpload(uploadData);
      
      res.json({
        uploadId: upload.id,
        sheets: upload.sheets,
        filename: upload.originalName
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ 
        message: "Upload failed", 
        error: (error as Error).message 
      });
    }
  });

  // Get upload details
  app.get("/api/upload/:uploadId", async (req, res) => {
    try {
      const upload = await storage.getUpload(req.params.uploadId);
      
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }
      
      res.json({
        uploadId: upload.id,
        sheets: upload.sheets,
        filename: upload.originalName,
        createdAt: upload.createdAt
      });
    } catch (error) {
      console.error("Get upload error:", error);
      res.status(500).json({ message: "Failed to retrieve upload" });
    }
  });

  // Get sheet preview
  app.get("/api/upload/:uploadId/sheet/:sheetName", async (req, res) => {
    try {
      const upload = await storage.getUpload(req.params.uploadId);
      
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }
      
      const sheet = upload.sheets.find(s => s.name === req.params.sheetName);
      
      if (!sheet) {
        return res.status(404).json({ message: "Sheet not found" });
      }
      
      res.json(sheet);
    } catch (error) {
      console.error("Get sheet error:", error);
      res.status(500).json({ message: "Failed to retrieve sheet" });
    }
  });

  // Generate code from natural language
  app.post("/api/generate-code", async (req, res) => {
    try {
      const { uploadId, sheetName, nlInstruction } = req.body;
      
      if (!uploadId || !sheetName || !nlInstruction) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const upload = await storage.getUpload(uploadId);
      
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }
      
      const sheet = upload.sheets.find(s => s.name === sheetName);
      
      if (!sheet) {
        return res.status(404).json({ message: "Sheet not found" });
      }
      
      const result = await generatePandasCode(nlInstruction, sheet.columns, sheet.preview);
      
      res.json(result);
    } catch (error) {
      console.error("Code generation error:", error);
      res.status(500).json({ 
        message: "Code generation failed", 
        error: (error as Error).message 
      });
    }
  });

  // Execute generated code
  app.post("/api/run", async (req, res) => {
    try {
      const { uploadId, sheetName, code, parameters, nlInstruction } = req.body;
      
      if (!uploadId || !sheetName || !code || !nlInstruction) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const upload = await storage.getUpload(uploadId);
      
      if (!upload) {
        return res.status(404).json({ message: "Upload not found" });
      }
      
      const sheet = upload.sheets.find(s => s.name === sheetName);
      
      if (!sheet) {
        return res.status(404).json({ message: "Sheet not found" });
      }
      
      // Create run record
      const runData = {
        uploadId,
        sheetName,
        nlInstruction,
        generatedCode: code,
        parameters: parameters || {},
        status: 'running',
        userId: undefined // TODO: Get from session when auth is implemented
      };
      
      const run = await storage.createRun(runData);
      
      // Execute code
      const executionResult = await executePandasCode(code, sheet.preview, parameters);
      
      if (executionResult.success) {
        await storage.updateRunStatus(run.id, 'completed', {
          summary: executionResult.summary,
          s3Key: `results/${randomUUID()}`, // In production, upload result to S3
          executionTime: executionResult.executionTime
        });
      } else {
        await storage.updateRunStatus(run.id, 'failed', {
          error: executionResult.error,
          executionTime: executionResult.executionTime
        });
      }
      
      res.json({
        runId: run.id,
        success: executionResult.success,
        summary: executionResult.summary,
        error: executionResult.error,
        downloadUrl: executionResult.success ? `/api/download/${run.id}` : undefined
      });
    } catch (error) {
      console.error("Run execution error:", error);
      res.status(500).json({ 
        message: "Execution failed", 
        error: (error as Error).message 
      });
    }
  });

  // Download results
  app.get("/api/download/:runId", async (req, res) => {
    try {
      const { format = 'xlsx' } = req.query;
      const run = await storage.getRun(req.params.runId);
      
      if (!run || run.status !== 'completed' || !run.resultSummary) {
        return res.status(404).json({ message: "Results not found" });
      }
      
      // In production, download from S3 using resultS3Key
      // For now, recreate from summary data
      const upload = await storage.getUpload(run.uploadId);
      const sheet = upload?.sheets.find(s => s.name === run.sheetName);
      
      if (!sheet) {
        return res.status(404).json({ message: "Original data not found" });
      }
      
      // Re-execute to get full results (in production, store full results)
      const executionResult = await executePandasCode(
        run.generatedCode, 
        sheet.preview, 
        run.parameters || {}
      );
      
      if (!executionResult.success || !executionResult.data) {
        return res.status(500).json({ message: "Failed to generate download" });
      }
      
      const buffer = createDownloadBuffer(executionResult.data, format as 'xlsx' | 'csv');
      const filename = `results_${run.id}.${format}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Playbook management
  app.post("/api/playbooks", async (req, res) => {
    try {
      const playbookData = insertPlaybookSchema.parse(req.body);
      const playbook = await storage.createPlaybook(playbookData);
      res.json(playbook);
    } catch (error) {
      console.error("Create playbook error:", error);
      res.status(400).json({ 
        message: "Failed to create playbook", 
        error: (error as Error).message 
      });
    }
  });

  app.get("/api/playbooks", async (req, res) => {
    try {
      const playbooks = await storage.getPlaybooks();
      res.json(playbooks);
    } catch (error) {
      console.error("Get playbooks error:", error);
      res.status(500).json({ message: "Failed to retrieve playbooks" });
    }
  });

  app.post("/api/playbooks/:id/run", async (req, res) => {
    try {
      const { uploadId, sheetName, parameterMapping } = req.body;
      const playbook = await storage.getPlaybook(req.params.id);
      
      if (!playbook) {
        return res.status(404).json({ message: "Playbook not found" });
      }
      
      // Apply parameter mapping to the code
      let modifiedCode = playbook.generatedCode;
      if (parameterMapping) {
        Object.entries(parameterMapping).forEach(([param, value]) => {
          modifiedCode = modifiedCode.replace(
            new RegExp(param, 'g'), 
            JSON.stringify(value)
          );
        });
      }
      
      // Execute the playbook
      const runData = {
        uploadId,
        playbookId: playbook.id,
        sheetName,
        nlInstruction: playbook.nlInstruction,
        generatedCode: modifiedCode,
        parameters: parameterMapping || {},
        status: 'running',
        userId: undefined
      };
      
      const run = await storage.createRun(runData);
      await storage.incrementPlaybookUsage(playbook.id);
      
      // Execute and return result (similar to /api/run)
      const upload = await storage.getUpload(uploadId);
      const sheet = upload?.sheets.find(s => s.name === sheetName);
      
      if (!sheet) {
        return res.status(404).json({ message: "Sheet not found" });
      }
      
      const executionResult = await executePandasCode(modifiedCode, sheet.preview, parameterMapping);
      
      if (executionResult.success) {
        await storage.updateRunStatus(run.id, 'completed', {
          summary: executionResult.summary,
          s3Key: `results/${randomUUID()}`,
          executionTime: executionResult.executionTime
        });
      } else {
        await storage.updateRunStatus(run.id, 'failed', {
          error: executionResult.error,
          executionTime: executionResult.executionTime
        });
      }
      
      res.json({
        runId: run.id,
        success: executionResult.success,
        summary: executionResult.summary,
        error: executionResult.error,
        downloadUrl: executionResult.success ? `/api/download/${run.id}` : undefined
      });
    } catch (error) {
      console.error("Run playbook error:", error);
      res.status(500).json({ 
        message: "Playbook execution failed", 
        error: (error as Error).message 
      });
    }
  });

  // Activity log
  app.get("/api/runs", async (req, res) => {
    try {
      const { limit = '10' } = req.query;
      const runs = await storage.getRecentRuns(undefined, parseInt(limit as string));
      res.json(runs);
    } catch (error) {
      console.error("Get runs error:", error);
      res.status(500).json({ message: "Failed to retrieve runs" });
    }
  });

  // Delete upload
  app.delete("/api/upload/:uploadId", async (req, res) => {
    try {
      await storage.markUploadDeleted(req.params.uploadId);
      res.json({ message: "Upload deleted successfully" });
    } catch (error) {
      console.error("Delete upload error:", error);
      res.status(500).json({ message: "Failed to delete upload" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
