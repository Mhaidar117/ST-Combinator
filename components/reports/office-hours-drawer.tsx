"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const ROLE_LABELS: Record<string, string> = {
  vc_partner: "VC Partner",
  customer_skeptic: "Customer Skeptic",
  growth_lead: "Growth Lead",
  product_strategist: "Product Strategist",
  technical_reviewer: "Technical Reviewer",
  competitor_analyst: "Competitor Analyst",
};

export function OfficeHoursDrawer(props: {
  analysisId: string;
  role: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTurns, setUserTurns] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const label = ROLE_LABELS[props.role] ?? props.role;
  const MAX_TURNS = 20;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset state when role changes or drawer opens fresh
  useEffect(() => {
    if (props.open) {
      setMessages([]);
      setInput("");
      setError(null);
      setUserTurns(0);
    }
  }, [props.open, props.role]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/critics/${props.role}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: props.analysisId,
          messages: newMessages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setMessages([
        ...newMessages,
        { role: "assistant", content: data.message },
      ]);
      setUserTurns(data.userTurns ?? userTurns + 1);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Office Hours: {label}</SheetTitle>
          <SheetDescription>
            Push back on this critic&apos;s assessment. {userTurns}/{MAX_TURNS}{" "}
            turns used.
          </SheetDescription>
        </SheetHeader>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        >
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start the conversation — challenge the {label.toLowerCase()}&apos;s
              critique.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
          {error && (
            <div className="text-center text-sm text-destructive">{error}</div>
          )}
        </div>

        {/* Input */}
        <div className="border-t px-6 py-4">
          {userTurns >= MAX_TURNS ? (
            <p className="text-sm text-muted-foreground text-center">
              Turn limit reached ({MAX_TURNS}/{MAX_TURNS}).
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Push back on this critique..."
                disabled={loading}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !input.trim()}
              >
                Send
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
