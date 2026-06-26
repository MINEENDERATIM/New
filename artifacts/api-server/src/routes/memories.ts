import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { db } from "@workspace/db";
import { memoriesTable } from "@workspace/db";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import {
  ListMemoriesQueryParams,
  UploadMemoryBody,
  UpdateMemoryBody,
  GetMemoryParams,
  UpdateMemoryParams,
  DeleteMemoryParams,
  ToggleFavoriteParams,
  GetTimelineQueryParams,
} from "@workspace/api-zod";

const router = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), "../../uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

function getFileUrl(req: any, filename: string): string {
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${proto}://${host}/api/memories/file/${filename}`;
}

function memoryToResponse(req: any, mem: typeof memoriesTable.$inferSelect) {
  return {
    id: mem.id,
    title: mem.title,
    description: mem.description ?? null,
    date: mem.date,
    location: mem.location ?? null,
    tags: mem.tags ?? [],
    filename: mem.filename,
    originalFilename: mem.originalFilename,
    isFavorite: mem.isFavorite,
    fileUrl: getFileUrl(req, mem.filename),
    fileType: mem.fileType,
    fileSize: mem.fileSize,
    width: mem.width ?? null,
    height: mem.height ?? null,
    createdAt: mem.createdAt.toISOString(),
  };
}

// Serve files
router.get("/file/:filename", (req, res) => {
  const filename = req.params.filename;
  if (!/^[\w\-.]+$/.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(filePath);
});

// GET /memories/timeline
router.get("/timeline", async (req, res) => {
  try {
    const parsed = GetTimelineQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};

    let conditions: any[] = [];
    if (params.year) {
      conditions.push(sql`EXTRACT(YEAR FROM TO_DATE(${memoriesTable.date}, 'YYYY-MM-DD')) = ${params.year}`);
    }
    if (params.month) {
      conditions.push(sql`EXTRACT(MONTH FROM TO_DATE(${memoriesTable.date}, 'YYYY-MM-DD')) = ${params.month}`);
    }

    const memories = await db
      .select()
      .from(memoriesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(memoriesTable.date));

    const yearMap = new Map<number, Map<number, { date: string; mems: typeof memories }>>();
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    for (const mem of memories) {
      const [y, m, d] = mem.date.split("-").map(Number);
      if (!yearMap.has(y)) yearMap.set(y, new Map());
      const monthMap = yearMap.get(y)!;
      const monthKey = m;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, { date: mem.date, mems: [] });
      // Group by date string
      let dayEntry = [...monthMap.values()].find(v => v.mems.some(m2 => m2.date === mem.date));
      if (!dayEntry) {
        monthMap.set(Number(`${monthKey}${d}`), { date: mem.date, mems: [mem] });
      } else {
        dayEntry.mems.push(mem);
      }
    }

    // Better grouping approach
    const dateGroups = new Map<string, typeof memories>();
    for (const mem of memories) {
      if (!dateGroups.has(mem.date)) dateGroups.set(mem.date, []);
      dateGroups.get(mem.date)!.push(mem);
    }

    const yearGroups = new Map<number, Map<number, Map<string, typeof memories>>>();
    for (const [date, mems] of dateGroups) {
      const [y, m] = date.split("-").map(Number);
      if (!yearGroups.has(y)) yearGroups.set(y, new Map());
      const yMap = yearGroups.get(y)!;
      if (!yMap.has(m)) yMap.set(m, new Map());
      yMap.get(m)!.set(date, mems);
    }

    const timeline = [...yearGroups.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        count: [...months.values()].reduce((acc, days) => acc + [...days.values()].reduce((a, ms) => a + ms.length, 0), 0),
        months: [...months.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([month, days]) => ({
            month,
            monthName: MONTH_NAMES[month - 1],
            count: [...days.values()].reduce((a, ms) => a + ms.length, 0),
            days: [...days.entries()]
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([date, mems]) => ({
                date,
                count: mems.length,
                memories: mems.map(m => memoryToResponse(req, m)),
              })),
          })),
      }));

    res.json(timeline);
  } catch (err) {
    req.log.error({ err }, "Failed to get timeline");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /memories/stats
router.get("/stats", async (req, res) => {
  try {
    const all = await db.select().from(memoriesTable);
    const total = all.length;
    const favorites = all.filter(m => m.isFavorite).length;

    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    const yearMap = new Map<number, Map<number, number>>();
    for (const mem of all) {
      const [y, m] = mem.date.split("-").map(Number);
      if (!yearMap.has(y)) yearMap.set(y, new Map());
      const mMap = yearMap.get(y)!;
      mMap.set(m, (mMap.get(m) ?? 0) + 1);
    }

    const years = [...yearMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        count: [...months.values()].reduce((a, b) => a + b, 0),
        months: [...months.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([month, count]) => ({
            month,
            monthName: MONTH_NAMES[month - 1],
            count,
          })),
      }));

    res.json({ total, favorites, years });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /memories
router.get("/", async (req, res) => {
  try {
    const parsed = ListMemoriesQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};

    let conditions: any[] = [];

    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(or(
        ilike(memoriesTable.title, q),
        ilike(memoriesTable.description, q),
        ilike(memoriesTable.location, q),
        sql`${memoriesTable.tags}::text ILIKE ${q}`,
      ));
    }

    if (params.year) {
      conditions.push(sql`EXTRACT(YEAR FROM TO_DATE(${memoriesTable.date}, 'YYYY-MM-DD')) = ${params.year}`);
    }
    if (params.month) {
      conditions.push(sql`EXTRACT(MONTH FROM TO_DATE(${memoriesTable.date}, 'YYYY-MM-DD')) = ${params.month}`);
    }
    if (params.day) {
      conditions.push(sql`EXTRACT(DAY FROM TO_DATE(${memoriesTable.date}, 'YYYY-MM-DD')) = ${params.day}`);
    }
    if (params.tag) {
      conditions.push(sql`${params.tag} = ANY(${memoriesTable.tags})`);
    }
    if (params.favorites === true || String(params.favorites) === "true") {
      conditions.push(eq(memoriesTable.isFavorite, true));
    }

    const rows = await db
      .select()
      .from(memoriesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(memoriesTable.date), desc(memoriesTable.createdAt));

    res.json(rows.map(m => memoryToResponse(req, m)));
  } catch (err) {
    req.log.error({ err }, "Failed to list memories");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /memories (multipart/form-data)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "File is required" });
      return;
    }

    const bodyParsed = UploadMemoryBody.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ error: "Invalid fields", details: bodyParsed.error.issues });
      return;
    }

    const { title, description, date, location, tags } = bodyParsed.data;

    const tagList: string[] = tags
      ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    let width: number | null = null;
    let height: number | null = null;
    try {
      const meta = await sharp(req.file.path).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      // ignore
    }

    const [inserted] = await db
      .insert(memoriesTable)
      .values({
        title,
        description: description ?? null,
        date,
        location: location ?? null,
        tags: tagList,
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        isFavorite: false,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        width,
        height,
        storagePath: req.file.path,
      })
      .returning();

    res.status(201).json(memoryToResponse(req, inserted));
  } catch (err) {
    req.log.error({ err }, "Failed to upload memory");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /memories/:id
router.get("/:id", async (req, res) => {
  try {
    const parsed = GetMemoryParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [mem] = await db.select().from(memoriesTable).where(eq(memoriesTable.id, parsed.data.id));
    if (!mem) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(memoryToResponse(req, mem));
  } catch (err) {
    req.log.error({ err }, "Failed to get memory");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /memories/:id
router.patch("/:id", async (req, res) => {
  try {
    const parsed = UpdateMemoryParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const bodyParsed = UpdateMemoryBody.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ error: "Invalid body", details: bodyParsed.error.issues });
      return;
    }

    const updates: Partial<typeof memoriesTable.$inferInsert> = {};
    const { title, description, date, location, tags } = bodyParsed.data;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (location !== undefined) updates.location = location;
    if (tags !== undefined) updates.tags = tags as string[];

    const [updated] = await db
      .update(memoriesTable)
      .set(updates)
      .where(eq(memoriesTable.id, parsed.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(memoryToResponse(req, updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update memory");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /memories/:id
router.delete("/:id", async (req, res) => {
  try {
    const parsed = DeleteMemoryParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [mem] = await db.select().from(memoriesTable).where(eq(memoriesTable.id, parsed.data.id));
    if (!mem) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Delete file
    try {
      fs.unlinkSync(mem.storagePath);
    } catch {
      // file may already be gone
    }

    await db.delete(memoriesTable).where(eq(memoriesTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete memory");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /memories/:id/favorite
router.patch("/:id/favorite", async (req, res) => {
  try {
    const parsed = ToggleFavoriteParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [mem] = await db.select().from(memoriesTable).where(eq(memoriesTable.id, parsed.data.id));
    if (!mem) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [updated] = await db
      .update(memoriesTable)
      .set({ isFavorite: !mem.isFavorite })
      .where(eq(memoriesTable.id, parsed.data.id))
      .returning();

    res.json(memoryToResponse(req, updated));
  } catch (err) {
    req.log.error({ err }, "Failed to toggle favorite");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
