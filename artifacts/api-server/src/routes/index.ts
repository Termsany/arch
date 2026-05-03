import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import stagesRouter from "./stages";
import feedbackRouter from "./feedback";
import estimatesRouter from "./estimates";
import plansRouter from "./plans";
import officesRouter from "./offices";
import clientPortalRouter from "./client-portal";
import filesRouter from "./files";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clientPortalRouter);
router.use(filesRouter);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(projectsRouter);
router.use(stagesRouter);
router.use(feedbackRouter);
router.use(estimatesRouter);
router.use(plansRouter);
router.use(officesRouter);

export default router;
