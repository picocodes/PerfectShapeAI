import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { BottomNav } from "../components/BottomNav";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hey! 👋 I'm your PerfectShape AI Coach. Ask me anything about your workout plan, nutrition, or how to stay motivated. I'm here to help you crush your goals! 💪",
  ts: Date.now(),
};

interface CoachResponse {
  response: string;
}

interface ApiError {
  error_code?: string;
  message?: string;
}

function useCoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [outOfCredits, setOutOfCredits] = useState(false);

  const send = async (prompt: string) => {
    const userMsg: ChatMessage = { role: "user", content: prompt, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const data = await apiFetch<CoachResponse>("/ai/coach", {
        method: "POST",
        body: JSON.stringify({ context: {}, prompt }),
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.response, ts: Date.now() },
      ]);
    } catch (err) {
      let errObj: ApiError = {};
      try {
        errObj = JSON.parse((err as Error).message) as ApiError;
      } catch {
        // not json
      }
      if (errObj.error_code === "out_of_credits") {
        setOutOfCredits(true);
      } else {
        // Fallback mock response
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "Great question! Consistency is your superpower 🌟. Try to hit your workout 5 days a week, keep your calorie deficit modest (250–300 kcal), and make sure you're getting 7–8 hours of sleep. Small habits compound into big results!",
            ts: Date.now(),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, outOfCredits, send };
}

const SUGGESTED_PROMPTS = [
  "How can I stay motivated?",
  "Is my calorie target right for me?",
  "I missed a workout — what now?",
  "How do I break a plateau?",
];

export function CoachPage() {
  const { messages, loading, outOfCredits, send } = useCoachChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await send(text);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed header */}
      <header className="sticky top-0 z-40 border-b border-fog bg-white/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-midnight text-lg">✦</div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">AI</p>
            <h1 className="font-display text-lg font-bold text-ink">PerfectShape Coach</h1>
          </div>
          <div className="ml-auto flex h-2 w-2 rounded-full bg-mint" />
        </div>
      </header>

      {/* Messages */}
      <main className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div
            key={msg.ts}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-midnight text-xs text-cream">
                ✦
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-sm bg-mint text-ink"
                  : "rounded-bl-sm bg-white text-ink shadow-sm ring-1 ring-fog"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-midnight text-xs text-cream">
              ✦
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-fog">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 animate-bounce rounded-full bg-ink/30"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {outOfCredits && (
          <div className="mx-auto w-full max-w-sm rounded-2xl bg-coral/10 p-4 text-center ring-1 ring-coral/20">
            <p className="text-sm font-semibold text-coral">You've used all your credits 😅</p>
            <p className="mt-1 text-xs text-ink/60">
              Get more coaching with a PerfectShape subscription.
            </p>
            <a
              href={import.meta.env.VITE_FREEMIUS_CHECKOUT_URL ?? "#"}
              className="mt-3 inline-block rounded-full bg-coral px-5 py-2 text-xs font-bold text-white transition hover:opacity-90"
            >
              Upgrade — $4.99/mo
            </a>
          </div>
        )}

        {/* Suggested prompts (show only at start) */}
        {messages.length === 1 && !loading && (
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-mint hover:text-mint"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Input bar */}
      <div className="sticky bottom-0 z-40 border-t border-fog bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask your coach anything…"
            rows={1}
            disabled={outOfCredits}
            className="flex-1 resize-none rounded-2xl border border-fog bg-cream/50 px-4 py-3 text-sm outline-none focus:border-mint disabled:opacity-50"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || outOfCredits}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-midnight text-cream transition hover:opacity-80 disabled:opacity-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-ink/30">Enter to send · Shift+Enter for new line</p>
      </div>

      <BottomNav />
    </div>
  );
}
