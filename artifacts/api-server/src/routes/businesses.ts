import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { SuspendedAccountError, withUserContext } from "../lib/user-context";
import { requireSupabaseAuth } from "../middlewares/supabase-auth";

const router: IRouter = Router();
const auth = requireSupabaseAuth;

function respondWithError(res: Response, error: unknown) {
  if (error instanceof SuspendedAccountError) {
    res.status(403).json({ error: { code: "account_suspended", message: error.message } });
    return;
  }
  logger.error({ err: error }, "Business API request failed");
  res.status(500).json({ error: { code: "internal_error", message: "The request could not be completed." } });
}

async function inUserContext(
  req: Request,
  res: Response,
  work: Parameters<typeof withUserContext>[1],
) {
  if (!req.authUser) {
    res.status(401).json({ error: { code: "authentication_required", message: "Sign in to continue." } });
    return;
  }
  try {
    const result = await withUserContext(req.authUser, work);
    res.json(result);
  } catch (error) {
    respondWithError(res, error);
  }
}

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function makeSlug(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "business"}-${randomUUID().slice(0, 8)}`;
}

router.get("/v1/me", auth, async (req, res) => {
  await inUserContext(req, res, async (client, appUserId) => {
    const user = await client.query(
      "SELECT id, email, full_name, status, created_at FROM public.app_users WHERE id = $1",
      [appUserId],
    );
    const memberships = await client.query(
      `SELECT b.id, b.name, b.slug, b.industry, b.country_code, b.currency_code,
              b.timezone, m.role, m.status AS membership_status
         FROM public.business_memberships m
         JOIN public.businesses b ON b.id = m.business_id
        WHERE m.user_id = $1 AND m.status = 'active' AND b.archived_at IS NULL
        ORDER BY b.name`,
      [appUserId],
    );
    return { user: user.rows[0], businesses: memberships.rows };
  });
});

router.get("/v1/businesses", auth, async (req, res) => {
  await inUserContext(req, res, async (client, appUserId) => {
    const result = await client.query(
      `SELECT b.id, b.name, b.slug, b.industry, b.country_code, b.currency_code,
              b.timezone, b.gst_registered, b.gstin, b.legal_business_name,
              m.role, m.status AS membership_status
         FROM public.business_memberships m
         JOIN public.businesses b ON b.id = m.business_id
        WHERE m.user_id = $1 AND m.status = 'active' AND b.archived_at IS NULL
        ORDER BY b.name`,
      [appUserId],
    );
    return { businesses: result.rows };
  });
});

router.post("/v1/businesses", auth, async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = readText(body.name, 120);
  if (!name) {
    res.status(400).json({ error: { code: "invalid_business_name", message: "Enter a business name up to 120 characters." } });
    return;
  }

  const industry = readText(body.industry, 60) ?? "other";
  const countryCode = (readText(body.countryCode, 2) ?? "IN").toUpperCase();
  const currencyCode = (readText(body.currencyCode, 3) ?? "INR").toUpperCase();
  const timezone = readText(body.timezone, 80) ?? "Asia/Kolkata";
  const gstRegistered = body.gstRegistered === true;
  const gstin = gstRegistered ? readText(body.gstin, 15) : null;
  const legalBusinessName = gstRegistered ? readText(body.legalBusinessName, 200) : null;

  await inUserContext(req, res, async (client, appUserId) => {
    const created = await client.query(
      `INSERT INTO public.businesses
        (name,slug,industry,country_code,currency_code,timezone,gst_registered,gstin,legal_business_name,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id,name,slug,industry,country_code,currency_code,timezone,gst_registered,gstin,legal_business_name,created_at`,
      [name, makeSlug(name), industry, countryCode, currencyCode, timezone, gstRegistered, gstin, legalBusinessName, appUserId],
    );
    const business = created.rows[0];
    await client.query(
      `INSERT INTO public.business_memberships (business_id,user_id,role,status,joined_at)
       VALUES ($1,$2,'owner','active',now())`,
      [business.id, appUserId],
    );
    await client.query(
      `INSERT INTO public.audit_logs (business_id,actor_user_id,action,entity_type,entity_id,after_data)
       VALUES ($1,$2,'created','business',$3,$4::jsonb)`,
      [business.id, appUserId, business.id, JSON.stringify({ name, industry })],
    );
    return { business, role: "owner" };
  });
});

router.get("/v1/businesses/:businessId/branches", auth, async (req, res) => {
  const businessId = String(req.params.businessId ?? "");
  await inUserContext(req, res, async (client) => {
    const result = await client.query(
      `SELECT id,business_id,code,name,address,timezone,latitude,longitude,
              geofence_radius_meters,is_active,created_at
         FROM public.branches
        WHERE business_id = $1 AND archived_at IS NULL
        ORDER BY name`,
      [businessId],
    );
    return { branches: result.rows };
  });
});

router.post("/v1/businesses/:businessId/branches", auth, async (req, res) => {
  const businessId = String(req.params.businessId ?? "");
  const body = (req.body ?? {}) as Record<string, unknown>;
  const code = readText(body.code, 30);
  const name = readText(body.name, 120);
  if (!code || !name) {
    res.status(400).json({ error: { code: "invalid_branch", message: "Branch code and name are required." } });
    return;
  }
  const address = readText(body.address, 500);
  const timezone = readText(body.timezone, 80);
  const latitude = typeof body.latitude === "number" && Number.isFinite(body.latitude) ? body.latitude : null;
  const longitude = typeof body.longitude === "number" && Number.isFinite(body.longitude) ? body.longitude : null;
  const geofenceRadius = typeof body.geofenceRadiusMeters === "number" && Number.isFinite(body.geofenceRadiusMeters)
    ? body.geofenceRadiusMeters
    : null;

  await inUserContext(req, res, async (client) => {
    const result = await client.query(
      `INSERT INTO public.branches
        (business_id,code,name,address,timezone,latitude,longitude,geofence_radius_meters)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id,business_id,code,name,address,timezone,latitude,longitude,geofence_radius_meters,is_active,created_at`,
      [businessId, code, name, address, timezone, latitude, longitude, geofenceRadius],
    );
    const branch = result.rows[0];
    await client.query(
      `INSERT INTO public.audit_logs (business_id,actor_user_id,action,entity_type,entity_id,after_data)
       VALUES ($1,$2,'created','branch',$3,$4::jsonb)`,
      [businessId, req.authUser?.id, branch.id, JSON.stringify({ code, name })],
    );
    return { branch };
  });
});

export default router;
