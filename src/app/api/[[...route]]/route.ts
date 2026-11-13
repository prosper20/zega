import { handle } from "hono/vercel";

import { createApi } from "@/server/api/app";
import { authenticate } from "@/server/api/authenticate";
import { db } from "@/server/db";
import { defaultStorage } from "@/server/storage";

export const dynamic = "force-dynamic";

const app = createApi({ db, authenticate, storage: defaultStorage() });
const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
