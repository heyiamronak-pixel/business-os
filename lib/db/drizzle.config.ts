import { defineConfig } from "drizzle-kit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (!migrationDatabaseUrl) {
  throw new Error("MIGRATION_DATABASE_URL is required for Drizzle migrations.");
}

export default defineConfig({
  schema: path.resolve(currentDir, "./src/schema/index.ts"),
  out: path.resolve(currentDir, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url: migrationDatabaseUrl,
  },
});
