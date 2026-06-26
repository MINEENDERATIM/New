import { Router } from "express";
import { db } from "@workspace/db";
import { memoriesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// GET /tags
router.get("/", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT tag, COUNT(*) as count
      FROM (
        SELECT unnest(tags) as tag FROM memories
      ) sub
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `);

    const tags = result.rows.map((r: any) => ({
      name: r.tag as string,
      count: Number(r.count),
    }));

    res.json(tags);
  } catch (err) {
    req.log.error({ err }, "Failed to list tags");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
