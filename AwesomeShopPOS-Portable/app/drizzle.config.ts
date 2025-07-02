
import { defineConfig } from "drizzle-kit";

let config;

if (process.env.NODE_ENV === 'production' && process.env.MYSQL_HOST) {
  config = defineConfig({
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
} else {
  config = defineConfig({
    out: "./db/migrations",
    schema: "./shared/schema.ts",
    dialect: "sqlite",
    dbCredentials: {
      url: "./pos-data.db",
    },
    verbose: true,
  });
}

export default config;
