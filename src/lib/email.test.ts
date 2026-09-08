import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isEmailConfigured } from "./email";

const ENV_KEYS = ["EMAIL_PROVIDER", "RESEND_API_KEY", "SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"] as const;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("isEmailConfigured", () => {
  it("is false with nothing set", () => {
    expect(isEmailConfigured()).toBe(false);
  });

  it("defaults to the resend provider and requires RESEND_API_KEY", () => {
    expect(isEmailConfigured()).toBe(false);
    process.env.RESEND_API_KEY = "re_test";
    expect(isEmailConfigured()).toBe(true);
  });

  it("checks SMTP credentials when EMAIL_PROVIDER=smtp", () => {
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.RESEND_API_KEY = "re_test"; // should be ignored in smtp mode
    expect(isEmailConfigured()).toBe(false);

    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_USER = "someone@gmail.com";
    expect(isEmailConfigured()).toBe(false); // still missing password

    process.env.SMTP_PASSWORD = "app-password";
    expect(isEmailConfigured()).toBe(true);
  });
});
