import { handle } from "hono/vercel";

import { createApi } from "@/server/api/app";
import { authenticate } from "@/server/api/authenticate";
import { db } from "@/server/db";
import { neonBus } from "@/server/realtime/neon-bus";
import { defaultStorage } from "@/server/storage";

export const dynamic = "force-dynamic";
// Live-update streams stay open for up to ~4.5 minutes before the browser reconnects.
export const maxDuration = 300;

const app = createApi({ db, authenticate, storage: defaultStorage(), events: neonBus });
const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
