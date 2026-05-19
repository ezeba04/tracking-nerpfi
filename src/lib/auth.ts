import { createHmac } from "crypto";

const SITE_PASSWORD = process.env.SITE_PASSWORD || "yogurt";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "trapitos-cp-tracker-2025";

export function generateAuthToken(): string {
  return createHmac("sha256", COOKIE_SECRET).update(SITE_PASSWORD).digest("hex");
}

export function isValidAuthToken(token: string): boolean {
  return token === generateAuthToken();
}
