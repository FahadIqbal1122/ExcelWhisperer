import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  s3Key: text("s3_key").notNull(),
  sheets: jsonb("sheets").notNull().$type<Array<{
    name: string;
    rowCount: number;
    columnCount: number;
    columns: Array<{
      name: string;
      type: string;
      index: number;
    }>;
    preview: Array<Record<string, any>>;
  }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
});

export const playbooks = pgTable("playbooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  description: text("description"),
  nlInstruction: text("nl_instruction").notNull(),
  generatedCode: text("generated_code").notNull(),
  parameters: jsonb("parameters").notNull().$type<Array<{
    name: string;
    type: string;
    defaultValue: any;
    description?: string;
  }>>(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const runs = pgTable("runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  uploadId: varchar("upload_id").notNull(),
  playbookId: varchar("playbook_id"),
  sheetName: text("sheet_name").notNull(),
  nlInstruction: text("nl_instruction").notNull(),
  generatedCode: text("generated_code").notNull(),
  parameters: jsonb("parameters").$type<Record<string, any>>(),
  status: text("status").notNull(), // 'pending', 'running', 'completed', 'failed'
  resultSummary: jsonb("result_summary").$type<{
    originalRowCount: number;
    resultRowCount: number;
    rowsAffected: number;
    preview: Array<Record<string, any>>;
  }>(),
  resultS3Key: text("result_s3_key"),
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const uploadsRelations = relations(uploads, ({ many }) => ({
  runs: many(runs),
}));

export const playbooksRelations = relations(playbooks, ({ many }) => ({
  runs: many(runs),
}));

export const runsRelations = relations(runs, ({ one }) => ({
  upload: one(uploads, {
    fields: [runs.uploadId],
    references: [uploads.id],
  }),
  playbook: one(playbooks, {
    fields: [runs.playbookId],
    references: [playbooks.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertUploadSchema = createInsertSchema(uploads).omit({
  id: true,
  createdAt: true,
});

export const insertPlaybookSchema = createInsertSchema(playbooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

export const insertRunSchema = createInsertSchema(runs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Playbook = typeof playbooks.$inferSelect;
export type InsertPlaybook = z.infer<typeof insertPlaybookSchema>;
export type Run = typeof runs.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;
