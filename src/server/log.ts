// JSON lines. Never log secrets, tokens or request bodies.

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const env = process.env.LOG_LEVEL as Level | "silent" | undefined;
  if (env === "silent") return Number.POSITIVE_INFINITY;
  if (env && env in RANK) return RANK[env];
  // Tests stay quiet unless LOG_LEVEL asks otherwise.
  if (process.env.VITEST || process.env.NODE_ENV === "test") return Number.POSITIVE_INFINITY;
  return process.env.NODE_ENV === "production" ? RANK.info : RANK.debug;
}

/** Errors become plain objects (name, message, a short stack, Postgres code) so they survive JSON. */
export function serializeError(err: unknown) {
  if (!(err instanceof Error)) return { message: String(err) };
  const cause = (err as { cause?: { code?: string } }).cause;
  return {
    name: err.name,
    message: err.message,
    ...(cause?.code ? { code: cause.code } : {}),
    stack: err.stack?.split("\n").slice(0, 6).join("\n"),
  };
}

function write(level: Level, event: string, fields: Fields = {}) {
  if (RANK[level] < threshold()) return;
  const { err, ...rest } = fields;
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...rest,
    ...(err === undefined ? {} : { err: serializeError(err) }),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  debug: (event: string, fields?: Fields) => write("debug", event, fields),
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
  /** Security-relevant events (denied access, role and account changes) carry `security: true`. */
  security: (event: string, fields?: Fields) => write("warn", event, { ...fields, security: true }),
};
