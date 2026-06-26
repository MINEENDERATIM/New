import { Router, type IRouter } from "express";
import healthRouter from "./health";
import memoriesRouter from "./memories";
import tagsRouter from "./tags";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/memories", memoriesRouter);
router.use("/tags", tagsRouter);

export default router;
