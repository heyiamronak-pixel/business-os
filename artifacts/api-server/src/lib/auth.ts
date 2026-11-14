import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { organization } from "better-auth/plugins";
import * as schema from "@workspace/db/schema";
import { db } from "@workspace/db";
import { logger } from "./logger";
import { escapeHtml, sendTransactionalEmail } from "./email";
import { organizationAccess, organizationRoles } from "./permissions";

function parseTrustedOrigins(): string[] {
  const configured = process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured?.length) return [...new Set(configured)];

  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_TRUSTED_ORIGINS must be configured in production.");
  }

  return ["http://localhost:5173", "http://127.0.0.1:5173"];
}

const authBaseUrl = process.env.BETTER_AUTH_URL;
const authSecret = process.env.BETTER_AUTH_SECRET;
const trustedOrigins = parseTrustedOrigins();

if (!authBaseUrl) {
  throw new Error("BETTER_AUTH_URL must point to the HTTPS API origin.");
}

if (!authSecret || authSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}

const publicAppUrl = process.env.APP_PUBLIC_URL;

function deliverEmailInBackground(
  to: string,
  subject: string,
  url: string,
  actionLabel: string,
): void {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(actionLabel);
  const html = `<main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033;line-height:1.6">
    <h1 style="font-size:22px">Business Sutra</h1>
    <p>${safeLabel}</p>
    <p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#172033;color:#fff;text-decoration:none;border-radius:8px">${safeLabel}</a></p>
    <p style="font-size:12px;color:#667085">If you did not request this, you can ignore this email.</p>
  </main>`;
  void sendTransactionalEmail({
    to,
    subject,
    html,
    text: `${actionLabel}: ${url}`,
  }).catch((error: unknown) => {
    logger.error({ error, action: "transactional_email", recipientDomain: to.split("@")[1] }, "Transactional email delivery failed");
  });
}

export const auth = betterAuth({
  appName: "Business Sutra",
  baseURL: authBaseUrl,
  secret: authSecret,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      deliverEmailInBackground(user.email, "Reset your Business Sutra password", url, "Reset your password");
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      deliverEmailInBackground(user.email, "Verify your Business Sutra email", url, "Verify your email address");
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [
    organization({
      ac: organizationAccess,
      roles: organizationRoles,
      creatorRole: "owner",
      allowUserToCreateOrganization: true,
      requireEmailVerificationOnInvitation: true,
      schema: {
        organization: {
          additionalFields: {
            industry: { type: "string", required: false, input: true },
            country: { type: "string", required: false, input: true },
            currency: { type: "string", required: false, input: true },
            timezone: { type: "string", required: false, input: true },
            phone: { type: "string", required: false, input: true },
            email: { type: "string", required: false, input: true },
            website: { type: "string", required: false, input: true },
            address: { type: "string", required: false, input: true },
            gstRegistered: { type: "boolean", required: false, input: true },
            gstin: { type: "string", required: false, input: true },
            legalBusinessName: { type: "string", required: false, input: true },
            brandColor: { type: "string", required: false, input: true },
            themeId: { type: "string", required: false, input: true },
            themeMode: { type: "string", required: false, input: true },
            enabledModules: { type: "string[]", required: false, input: true },
          },
        },
        member: {
          additionalFields: {
            status: { type: "string", required: false, input: false, defaultValue: "active" },
          },
        },
      },
      sendInvitationEmail: async (data) => {
        if (!publicAppUrl) {
          throw new Error("APP_PUBLIC_URL must be configured before sending organization invitations.");
        }
        const inviteUrl = new URL(`/accept-invitation/${encodeURIComponent(data.id)}`, publicAppUrl).toString();
        deliverEmailInBackground(
          data.email,
          `You're invited to join ${data.organization.name} on Business Sutra`,
          inviteUrl,
          `You have been invited by ${data.inviter.user.name} to join ${data.organization.name}`,
        );
      },
    }),
  ],
});

export { trustedOrigins };
