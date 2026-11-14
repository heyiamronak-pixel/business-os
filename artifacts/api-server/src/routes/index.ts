import { and, eq, isNull } from "drizzle-orm";
import { fromNodeHeaders } from "better-auth/node";
import { Router, type IRouter } from "express";
import { db, member, organization } from "@workspace/db";
import { auth } from "../lib/auth";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);

router.get("/me", async (req, res, next) => {
  try {
    const currentSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!currentSession) {
      res.status(401).json({ error: "UNAUTHENTICATED" });
      return;
    }

    const memberships = await db
      .select({
        organizationId: organization.id,
        name: organization.name,
        slug: organization.slug,
        industry: organization.industry,
        currency: organization.currency,
        timezone: organization.timezone,
        role: member.role,
        status: member.status,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(
        and(
          eq(member.userId, currentSession.user.id),
          eq(member.status, "active"),
          isNull(organization.deletedAt),
        ),
      );

    res.json({
      user: {
        id: currentSession.user.id,
        name: currentSession.user.name,
        email: currentSession.user.email,
        emailVerified: currentSession.user.emailVerified,
        image: currentSession.user.image,
      },
      activeOrganizationId: currentSession.session.activeOrganizationId,
      organizations: memberships,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
