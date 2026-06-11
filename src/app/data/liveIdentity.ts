import { randomUUID } from "crypto";
import type { AuthSession } from "../infrastructure/auth";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeDocumentIdSegment(value: string) {
  return value
    .trim()
    .replace(/\//g, "-")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugifyIdentityPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getLiveParentUid(session: AuthSession | null | undefined) {
  const parentUid = normalizeText(session?.user.id);

  return parentUid || null;
}

export function getLiveParentId(session: AuthSession | null | undefined) {
  const parentUid = getLiveParentUid(session);

  if (!parentUid) {
    return null;
  }

  const normalizedParentUid = normalizeDocumentIdSegment(parentUid);

  return normalizedParentUid ? `parent-${normalizedParentUid}` : null;
}

export function createLiveRecordId(prefix: string, parts: string[]) {
  const slug = parts.map(slugifyIdentityPart).filter(Boolean).join("-");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10);

  return `${prefix}-${slug || "record"}-${suffix}`;
}
