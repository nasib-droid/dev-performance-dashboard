import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// ponytail: fallback keeps `next build` from crashing when collecting route
// data with no DATABASE_URL set; the neon-http client is lazy and only
// connects when a query actually runs, so this is never hit at runtime.
export const db = drizzle(process.env.DATABASE_URL ?? "postgres://user:pass@localhost/db", { schema });
