import { 
  users, uploads, playbooks, runs,
  type User, type InsertUser,
  type Upload, type InsertUpload,
  type Playbook, type InsertPlaybook,
  type Run, type InsertRun
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUpload(id: string): Promise<Upload | undefined>;
  getActiveUploads(userId?: string): Promise<Upload[]>;
  deleteUpload(id: string): Promise<void>;
  markUploadDeleted(id: string): Promise<void>;
  
  createPlaybook(playbook: InsertPlaybook): Promise<Playbook>;
  getPlaybooks(userId?: string): Promise<Playbook[]>;
  getPlaybook(id: string): Promise<Playbook | undefined>;
  incrementPlaybookUsage(id: string): Promise<void>;
  
  createRun(run: InsertRun): Promise<Run>;
  getRun(id: string): Promise<Run | undefined>;
  getRuns(userId?: string): Promise<Run[]>;
  updateRunStatus(id: string, status: string, result?: any): Promise<void>;
  getRecentRuns(userId?: string, limit?: number): Promise<Run[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createUpload(upload: InsertUpload): Promise<Upload> {
    const [result] = await db
      .insert(uploads)
      .values(upload as any)
      .returning();
    return result;
  }

  async getUpload(id: string): Promise<Upload | undefined> {
    const [upload] = await db
      .select()
      .from(uploads)
      .where(and(eq(uploads.id, id), eq(uploads.isDeleted, false)));
    return upload || undefined;
  }

  async getActiveUploads(userId?: string): Promise<Upload[]> {
    const conditions = [
      eq(uploads.isDeleted, false),
      gte(uploads.expiresAt, new Date())
    ];
    
    if (userId) {
      conditions.push(eq(uploads.userId, userId));
    }

    return await db
      .select()
      .from(uploads)
      .where(and(...conditions))
      .orderBy(desc(uploads.createdAt));
  }

  async deleteUpload(id: string): Promise<void> {
    await db.delete(uploads).where(eq(uploads.id, id));
  }

  async markUploadDeleted(id: string): Promise<void> {
    await db
      .update(uploads)
      .set({ isDeleted: true })
      .where(eq(uploads.id, id));
  }

  async createPlaybook(playbook: InsertPlaybook): Promise<Playbook> {
    const [result] = await db
      .insert(playbooks)
      .values(playbook as any)
      .returning();
    return result;
  }

  async getPlaybooks(userId?: string): Promise<Playbook[]> {
    const query = db.select().from(playbooks);
    
    if (userId) {
      return await query.where(eq(playbooks.userId, userId)).orderBy(desc(playbooks.updatedAt));
    }
    
    return await query.orderBy(desc(playbooks.updatedAt));
  }

  async getPlaybook(id: string): Promise<Playbook | undefined> {
    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(eq(playbooks.id, id));
    return playbook || undefined;
  }

  async incrementPlaybookUsage(id: string): Promise<void> {
    await db
      .update(playbooks)
      .set({ 
        usageCount: sql`${playbooks.usageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(playbooks.id, id));
  }

  async createRun(run: InsertRun): Promise<Run> {
    const [result] = await db
      .insert(runs)
      .values(run as any)
      .returning();
    return result;
  }

  async getRun(id: string): Promise<Run | undefined> {
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, id));
    return run || undefined;
  }

  async getRuns(userId?: string): Promise<Run[]> {
    const query = db.select().from(runs);
    
    if (userId) {
      return await query.where(eq(runs.userId, userId)).orderBy(desc(runs.createdAt));
    }
    
    return await query.orderBy(desc(runs.createdAt));
  }

  async updateRunStatus(id: string, status: string, result?: any): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }
    
    if (result) {
      if (result.summary) updateData.resultSummary = result.summary;
      if (result.s3Key) updateData.resultS3Key = result.s3Key;
      if (result.error) updateData.errorMessage = result.error;
      if (result.executionTime) updateData.executionTimeMs = result.executionTime;
    }

    await db
      .update(runs)
      .set(updateData)
      .where(eq(runs.id, id));
  }

  async getRecentRuns(userId?: string, limit: number = 10): Promise<Run[]> {
    const query = db.select().from(runs);
    
    if (userId) {
      return await query
        .where(eq(runs.userId, userId))
        .orderBy(desc(runs.createdAt))
        .limit(limit);
    }
    
    return await query
      .orderBy(desc(runs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
