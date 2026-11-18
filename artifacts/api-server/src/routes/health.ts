import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function healthPayload() {
  return HealthCheckResponse.parse({ status: "ok" });
}

// Friendly service-root response for manual checks in a browser.
router.get("/", (_req, res) => {
  res.json({
    service: "Business Sutra API",
    status: "ok",
    health: "/api/healthz",
  });
});

router.get("/healthz", (_req, res) => {
  res.json(healthPayload());
});

export default router;
