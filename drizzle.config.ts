import { defineConfig } from "drizzle-kit";

// For cPanel MySQL hosting
if (process.env.NODE_ENV === 'production' && process.env.MYSQL_HOST) {
  export default defineConfig({
    out: "./db/migrations",
    schema: "./shared/schema.ts",
    dialect: "mysql",
    dbCredentials: {
      host: "localhost",
      user: "fastflyi_fast",
      password: "mushu@123",
      database: "fastflyi_poss",
    },
    verbose: true,
  });
}

// Default SQLite configuration (recommended)
export default defineConfig({
  out: "./db/migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./pos-data.db",
  },
  verbose: true,
});
