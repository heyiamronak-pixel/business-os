import { pool } from "@workspace/db";
import type { SupabaseIdentity } from "../middlewares/supabase-auth";

export type UserDbClient = Awaited<ReturnType<typeof pool.connect>>;

export class SuspendedAccountError extends Error {
  constructor() {
    super("This account is currently suspended.");
    this.name = "SuspendedAccountError";
  }
}

/**
 * Every protected database operation runs in one transaction. The app.user_id
 * setting is transaction-local and is derived only from a Supabase-verified
 * identity, so pooled connections cannot leak tenant context between requests.
 */
export async function withUserContext<T>(
  identity: SupabaseIdentity,
  work: (
    client: UserDbClient,
    appUserId: string,
  ) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const synced = await client.query<{ id: string }>(
      "SELECT public.app_sync_authenticated_user($1::uuid, $1::text, $2::text, $3::text) AS id",
      [identity.id, identity.email, identity.fullName],
    );
    const appUserId = synced.rows[0]?.id;

    if (!appUserId) {
      throw new Error("Identity sync did not return an application user.");
    }

    await client.query(
      "SELECT pg_catalog.set_config('app.user_id', $1, true)",
      [appUserId],
    );

    const account = await client.query<{ status: string }>(
      "SELECT status FROM public.app_users WHERE id = $1",
      [appUserId],
    );
    if (account.rows[0]?.status !== "active") {
      throw new SuspendedAccountError();
    }

    const result = await work(client, appUserId);
    await client.query("COMMIT");
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original request error; the pool will discard bad clients.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
