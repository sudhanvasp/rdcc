"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Sparkles, Send, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Message = { id?: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's due this week?",
  "Which projects are blocked?",
  "Who's overloaded right now?",
  "Summarize what's happening across all projects",
];

export function AIChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/chat")
      .then((r) => r.json())
      .then((data) => {
        setConversationId(data.conversationId);
        setMessages(data.messages ?? []);
      })
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }]);
    setLoading(true);

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, conversationId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setConversationId(data.conversationId);
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="mb-3 flex justify-end">
        <span className="rounded-full bg-signal-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal">
          Beta
        </span>
      </div>
      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          {!loadingHistory && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-signal-soft text-signal">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-[13px] font-medium text-ink">Ask about your R&D workspace</p>
                <p className="text-[13px] text-muted">Answers come from your actual projects, tasks, and team data.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-md border border-line bg-surface px-3 py-1.5 text-[12px] text-muted hover:bg-canvas hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-md px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user" ? "bg-signal text-white" : "border border-line bg-canvas text-ink"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-md border border-line bg-canvas px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="flex items-start gap-2 border-t border-line bg-critical-soft px-4 py-2.5 text-[12.5px] text-critical">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-end gap-2 border-t border-line p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about your projects, tasks, or team…"
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-signal/30"
          />
          <Button onClick={() => send()} disabled={!input.trim() || loading}>
            <Send size={14} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
