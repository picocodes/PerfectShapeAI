import express from "express";
import cors from "cors";
import { json } from "express";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { weightRouter } from "./routes/weight.js";
import { workoutsRouter } from "./routes/workouts.js";
import { mealsRouter } from "./routes/meals.js";
import { gamificationRouter } from "./routes/gamification.js";
import { aiRouter } from "./routes/ai.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { freemiusWebhookRouter } from "./routes/freemiusWebhook.js";

export const app = express();

app.use(cors({ origin: true }));
app.use(json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/weight", weightRouter);
app.use("/workouts", workoutsRouter);
app.use("/meals", mealsRouter);
app.use("/gamification", gamificationRouter);
app.use("/ai", aiRouter);
app.use("/subscriptions", subscriptionsRouter);
app.use("/freemius-webhook", freemiusWebhookRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});
