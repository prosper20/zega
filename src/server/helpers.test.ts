import { describe, expect, it } from "vitest";

import { describeUserAgent, formatIp } from "@/app/(main)/dashboard/profile/_components/user-agent";
import { toPostman } from "@/server/api/openapi";
import { canReceive, parseEvent, type ZegaEvent } from "@/server/realtime/events";
import { toCsv } from "@/server/services/reports";
import { sniffImage } from "@/server/storage";

const user = (role: "student" | "officer" | "admin", id = "u1") => ({
  id,
  name: "X",
  email: "x@y.z",
  image: null,
  role,
  department: null,
  matricOrStaffNo: null,
});

describe("CSV export", () => {
  it("quotes special characters and neutralises spreadsheet formulas", () => {
    const csv = toCsv(
      ["A", "B"],
      [
        ["=HYPERLINK(evil)", 'say "hi", ok'],
        ["+1", null],
      ],
    );
    expect(csv.startsWith("﻿A,B\r\n")).toBe(true);
    expect(csv).toContain("'=HYPERLINK(evil)");
    expect(csv).toContain('"say ""hi"", ok"');
    expect(csv).toContain("'+1,");
  });
});

describe("image sniffing", () => {
  it("identifies real images by their bytes, not their names", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    expect(sniffImage(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("image/webp");
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("live event routing", () => {
  const status: ZegaEvent = {
    type: "request.status",
    requestId: "r",
    refCode: "ZG-26-000001",
    status: "assigned",
    requesterId: "req",
    assigneeId: "off",
    at: "",
  };
  it("delivers request events to the people involved and to admins only", () => {
    expect(canReceive(user("student", "req"), status)).toBe(true);
    expect(canReceive(user("officer", "off"), status)).toBe(true);
    expect(canReceive(user("admin", "boss"), status)).toBe(true);
    expect(canReceive(user("student", "other"), status)).toBe(false);
  });
  it("delivers notifications only to their owner and ignores junk payloads", () => {
    expect(canReceive(user("admin", "boss"), { type: "notification", id: "n", userId: "req", requestId: null })).toBe(
      false,
    );
    expect(parseEvent("not json")).toBeNull();
    expect(parseEvent(JSON.stringify({ type: "evil" }))).toBeNull();
    expect(parseEvent(JSON.stringify(status))).toEqual(status);
  });
});

describe("session labels", () => {
  it("summarises user agents and hides local addresses", () => {
    expect(describeUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/120 Safari/537")).toMatchObject({
      browser: "Chrome",
      os: "Windows",
    });
    expect(describeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari/604.1 Mobile")).toMatchObject({
      os: "iOS",
      mobile: true,
    });
    expect(formatIp("0000:0000:0000:0000:0000:0000:0000:0000")).toBe("Local network");
    expect(formatIp("::ffff:192.168.1.4")).toBe("Local network");
    expect(formatIp("102.89.4.20")).toBe("102.89.4.20");
  });
});

describe("Postman export", () => {
  it("groups operations by tag and builds example bodies from the schema", () => {
    const doc = {
      info: { title: "ZEGA API" },
      paths: {
        "/api/requests/{id}/transitions": {
          post: {
            summary: "Change status",
            tags: ["Requests"],
            parameters: [{ name: "id", in: "path", example: "ZG-26-000001" }],
            requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/T" } } } },
          },
        },
      },
      components: {
        schemas: {
          T: {
            type: "object",
            required: ["to"],
            properties: { to: { enum: ["closed"] }, note: { type: "string", example: "Done" } },
          },
        },
      },
    };
    const col = toPostman(doc, "https://zega.test");
    const item = col.item[0].item[0] as { request: { url: { raw: string }; body: { raw: string } } };
    expect(col.item[0].name).toBe("Requests");
    expect(item.request.url.raw).toBe("{{baseUrl}}/api/requests/:id/transitions");
    expect(JSON.parse(item.request.body.raw)).toEqual({ to: "closed", note: "Done" });
  });
});
