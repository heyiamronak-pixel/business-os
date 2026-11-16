import type { NextFunction, Request, Response } from "express";

export interface SupabaseIdentity {
  id: string;
  email: string;
  fullName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: SupabaseIdentity;
    }
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendAuthError(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  res.status(status).json({ error: { code, message } });
}

/**
 * Validate the bearer token with Supabase Auth itself. The API never trusts
 * decoded JWT claims or a user ID supplied by the browser.
 */
export async function requireSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.get("authorization");
  const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!tokenMatch) {
    sendAuthError(res, 401, "authentication_required", "Sign in to continue.");
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    sendAuthError(
      res,
      503,
      "authentication_not_configured",
      "Sign-in is not configured on this server yet.",
    );
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${tokenMatch[1]}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 400 || response.status === 403) {
        sendAuthError(res, 401, "invalid_session", "Your session is invalid or expired. Please sign in again.");
      } else {
        sendAuthError(res, 503, "identity_provider_unavailable", "Sign-in verification is temporarily unavailable.");
      }
      return;
    }

    const user: unknown = await response.json();
    if (
      !user ||
      typeof user !== "object" ||
      !("id" in user) ||
      typeof user.id !== "string" ||
      !UUID_PATTERN.test(user.id) ||
      !("email" in user) ||
      typeof user.email !== "string" ||
      user.email.trim().length === 0
    ) {
      sendAuthError(res, 401, "invalid_identity", "The identity provider returned an incomplete account.");
      return;
    }

    const metadata =
      "user_metadata" in user &&
      user.user_metadata &&
      typeof user.user_metadata === "object"
        ? user.user_metadata
        : {};
    const possibleName =
      "full_name" in metadata && typeof metadata.full_name === "string"
        ? metadata.full_name
        : "name" in metadata && typeof metadata.name === "string"
          ? metadata.name
          : null;

    req.authUser = {
      id: user.id,
      email: user.email.trim().toLowerCase(),
      fullName: possibleName?.trim() || null,
    };
    next();
  } catch {
    sendAuthError(
      res,
      503,
      "identity_provider_unavailable",
      "Sign-in verification is temporarily unavailable.",
    );
  }
}
