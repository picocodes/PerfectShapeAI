import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { isInstallId } from "../domain/entitlements.js";
import { PerfectService, type ServiceDeps } from "../services/perfectService.js";
import type { AuthVerifier } from "./auth.js";
import { HttpError } from "./errors.js";
import { SlidingWindowLimiter } from "./limiter.js";
import {
  adjustSchema,
  appleSchema,
  coachSchema,
  dateBodySchema,
  deleteSchema,
  googleSchema,
  mealSchema,
  moodSchema,
  photoSchema,
  profileSchema,
  refreshSchema,
  stepsSchema,
  waterSchema,
  weightSchema,
  workoutSchema
} from "./schemas.js";

export interface AppDeps extends ServiceDeps {
  auth: AuthVerifier;
  limiter: SlidingWindowLimiter;
}

interface AuthedRequest extends Request {
  uid?: string;
  email?: string | null;
}

export function createApp(deps: AppDeps) {
  const app = express();
  const service = new PerfectService(deps);
  app.disable("x-powered-by");
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "4mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, service: "perfectshape" });
  });

  app.use(async (req: AuthedRequest, _res, next) => {
    try {
      const user = await deps.auth.verify(req.header("authorization"));
      req.uid = user.uid;
      req.email = user.email;
      next();
    } catch (error) {
      next(error);
    }
  });

  const uid = (req: AuthedRequest) => {
    if (!req.uid) throw new HttpError(401, "missing_auth", "Sign in again.");
    return req.uid;
  };
  const dateQuery = (req: Request) => {
    const date = req.query.date;
    if (typeof date !== "string") throw new HttpError(400, "bad_date", "Add a date query, YYYY-MM-DD.");
    return date;
  };
  const install = (req: Request) => {
    const value = req.header("x-install-id");
    if (!isInstallId(value)) throw new HttpError(400, "bad_install_id", "Update the app and try again.");
    return value;
  };
  const guardAi = (req: AuthedRequest) => {
    if (!deps.limiter.allow(`${uid(req)}:ai`)) {
      throw new HttpError(429, "rate_limited", "Too many coach requests. Try again in a little while.");
    }
  };

  app.post("/v1/session", wrap(async (req, res) => {
    res.json({ user: await service.session(uid(req), req.email ?? null) });
  }));
  app.get("/v1/me", wrap(async (req, res) => {
    res.json({ user: await service.getMe(uid(req)) });
  }));
  app.put("/v1/me", wrap(async (req, res) => {
    res.json({ user: await service.updateProfile(uid(req), profileSchema.parse(req.body)) });
  }));
  app.delete("/v1/me", wrap(async (req, res) => {
    const body = deleteSchema.parse(req.body ?? {});
    await service.deleteAccount(uid(req), body.confirm);
    res.json({ deleted: true });
  }));

  app.post("/v1/weight", wrap(async (req, res) => {
    res.json({ weight: await service.addWeight(uid(req), weightSchema.parse(req.body)) });
  }));
  app.get("/v1/weight", wrap(async (req, res) => {
    res.json({ weights: await service.listWeights(uid(req)) });
  }));

  app.get("/v1/today", wrap(async (req, res) => {
    res.json(await service.today(uid(req), dateQuery(req)));
  }));
  app.get("/v1/plan", wrap(async (req, res) => {
    res.json({ plan: await service.getPlan(uid(req), dateQuery(req)) });
  }));
  app.post("/v1/plan/regenerate", wrap(async (req, res) => {
    const body = dateBodySchema.parse(req.body);
    res.json({ plan: await service.regeneratePlan(uid(req), body.local_date) });
  }));
  app.post("/v1/plan/gentler", wrap(async (req, res) => {
    const body = dateBodySchema.parse(req.body);
    res.json({ day: await service.gentler(uid(req), body.local_date) });
  }));
  app.post("/v1/workouts/complete", wrap(async (req, res) => {
    res.json(await service.completeWorkout(uid(req), workoutSchema.parse(req.body)));
  }));

  app.post("/v1/meals", wrap(async (req, res) => {
    res.json(await service.addMeal(uid(req), mealSchema.parse(req.body)));
  }));
  app.get("/v1/meals", wrap(async (req, res) => {
    res.json({ meals: await service.listMeals(uid(req), dateQuery(req)) });
  }));
  app.post("/v1/water", wrap(async (req, res) => {
    res.json(await service.addWater(uid(req), waterSchema.parse(req.body)));
  }));
  app.post("/v1/mood", wrap(async (req, res) => {
    res.json(await service.setMood(uid(req), moodSchema.parse(req.body)));
  }));
  app.post("/v1/steps", wrap(async (req, res) => {
    res.json(await service.setSteps(uid(req), stepsSchema.parse(req.body)));
  }));
  app.get("/v1/gamification", wrap(async (req, res) => {
    res.json(await service.gamification(uid(req), dateQuery(req)));
  }));
  app.get("/v1/coach/history", wrap(async (req, res) => {
    res.json({ messages: await service.history(uid(req)) });
  }));

  app.post("/v1/ai/coach", wrap(async (req, res) => {
    guardAi(req);
    const body = coachSchema.parse(req.body);
    res.json(await service.coach(uid(req), { ...body, installId: install(req) }));
  }));
  app.post("/v1/ai/adjust-plan", wrap(async (req, res) => {
    guardAi(req);
    const body = adjustSchema.parse(req.body);
    res.json(await service.adjustPlan(uid(req), { ...body, installId: install(req) }));
  }));
  app.post("/v1/ai/meal-photo", wrap(async (req, res) => {
    guardAi(req);
    const body = photoSchema.parse(req.body);
    res.json(
      await service.mealPhoto(uid(req), {
        local_date: body.local_date,
        imageBase64: body.image_base64,
        mediaType: body.media_type,
        installId: install(req)
      })
    );
  }));

  app.get("/v1/subscription", wrap(async (req, res) => {
    res.json(await service.subscription(uid(req), dateQuery(req)));
  }));
  app.post("/v1/subscription/apple", wrap(async (req, res) => {
    const body = appleSchema.parse(req.body);
    res.json(await service.verifyApple(uid(req), body.signed_transaction));
  }));
  app.post("/v1/subscription/google", wrap(async (req, res) => {
    const body = googleSchema.parse(req.body);
    res.json(await service.verifyGoogle(uid(req), body.purchase_token));
  }));
  app.post("/v1/subscription/refresh", wrap(async (req, res) => {
    const body = refreshSchema.parse(req.body ?? {});
    res.json(await service.refreshSubscription(uid(req), body.signed_transaction));
  }));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ error: "invalid_body", message: err.issues[0]?.message ?? "Invalid request" });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "invalid_json", message: "Send valid JSON." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "internal_error", message: "Something went wrong." });
  });

  return app;
}

function wrap(handler: (req: AuthedRequest, res: Response) => Promise<void>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
