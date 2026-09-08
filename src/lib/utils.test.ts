import { describe, it, expect } from "vitest";
import { initials, daysUntil, dueLabel, formatDate } from "./utils";

describe("initials", () => {
  it("takes the first letter of up to two words", () => {
    expect(initials("Reddy")).toBe("R");
    expect(initials("Naveen Reddy")).toBe("NR");
    expect(initials("A B C D")).toBe("AB");
  });

  it("handles extra whitespace", () => {
    expect(initials("  Reddy   Kumar  ")).toBe("RK");
  });
});

describe("daysUntil", () => {
  it("returns null for no date", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(undefined)).toBeNull();
  });

  it("returns 0 for today", () => {
    expect(daysUntil(new Date())).toBe(0);
  });

  it("returns a positive number for future dates", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(daysUntil(future)).toBe(5);
  });

  it("returns a negative number for past dates", () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    expect(daysUntil(past)).toBe(-3);
  });
});

describe("dueLabel", () => {
  it("labels a missing date", () => {
    expect(dueLabel(null)).toBe("No due date");
  });

  it("labels today and tomorrow specially", () => {
    expect(dueLabel(new Date())).toBe("Due today");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(dueLabel(tomorrow)).toBe("Due tomorrow");
  });

  it("labels overdue dates with the correct day count", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(dueLabel(twoDaysAgo)).toBe("2d overdue");
  });

  it("labels far-future dates with a day count", () => {
    const inTenDays = new Date();
    inTenDays.setDate(inTenDays.getDate() + 10);
    expect(dueLabel(inTenDays)).toBe("Due in 10d");
  });
});

describe("formatDate", () => {
  it("returns an em dash placeholder for no date", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formats a real date without throwing", () => {
    expect(formatDate("2026-09-15")).toMatch(/Sep/);
  });
});
