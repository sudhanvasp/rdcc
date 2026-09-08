import { describe, it, expect } from "vitest";
import { parseIncomingMessage } from "./whatsapp";

function payloadWithMessage(message: unknown) {
  return {
    entry: [{ changes: [{ value: { messages: [message] } }] }],
  };
}

describe("parseIncomingMessage", () => {
  it("parses a plain text message", () => {
    const result = parseIncomingMessage(
      payloadWithMessage({ from: "919876543210", type: "text", text: { body: "Laser harp" } })
    );
    expect(result).toEqual({ from: "919876543210", text: "Laser harp" });
  });

  it("parses a button reply as text + replyId", () => {
    const result = parseIncomingMessage(
      payloadWithMessage({
        from: "919876543210",
        type: "interactive",
        interactive: { button_reply: { id: "priority_high", title: "High" } },
      })
    );
    expect(result).toEqual({ from: "919876543210", text: "High", replyId: "priority_high" });
  });

  it("parses a list reply the same way as a button reply", () => {
    const result = parseIncomingMessage(
      payloadWithMessage({
        from: "919876543210",
        type: "interactive",
        interactive: { list_reply: { id: "user-abc-123", title: "Naveen" } },
      })
    );
    expect(result).toEqual({ from: "919876543210", text: "Naveen", replyId: "user-abc-123" });
  });

  it("returns null for a payload with no messages (e.g. a status update webhook)", () => {
    const result = parseIncomingMessage({ entry: [{ changes: [{ value: {} }] }] });
    expect(result).toBeNull();
  });

  it("returns null for a completely malformed payload without throwing", () => {
    expect(parseIncomingMessage({})).toBeNull();
    expect(parseIncomingMessage(null)).toBeNull();
    expect(parseIncomingMessage(undefined)).toBeNull();
    expect(parseIncomingMessage({ entry: [] })).toBeNull();
  });

  it("returns null for an interactive message with neither button nor list reply", () => {
    const result = parseIncomingMessage(
      payloadWithMessage({ from: "919876543210", type: "interactive", interactive: {} })
    );
    expect(result).toBeNull();
  });
});
