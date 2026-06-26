import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoriesTable = pgTable("memories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // YYYY-MM-DD
  location: text("location"),
  tags: text("tags").array().notNull().default([]),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  isFavorite: boolean("is_favorite").notNull().default(false),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  storagePath: text("storage_path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memoriesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memoriesTable.$inferSelect;
