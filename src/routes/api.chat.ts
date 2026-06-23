import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Body = { messages?: UIMessage[]; context?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, context } = (await request.json()) as Body;
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const system = `You are "Momentum Coach" — a long-term behavioral analyst, performance coach, and accountability partner. You are NOT a generic chatbot. You see the user's actual data and behavioral discoveries in JSON below.

Operating principles:
- Reference past failures and wins by name and number (e.g. "Your DSA consistency dropped from 74% to 32%").
- When the user asks a vague question, ground your answer in their numbers, discoveries, and check-in patterns (mood/energy/sleep).
- Be honest about regressions. Don't sugar-coat. Don't be cruel.
- Connect causes (sleep, mood, day-of-week) to outcomes when the data supports it. Cite the discovery confidence if relevant.
- For long-term goals, reference progress vs target and call out forecast slippage.
- Keep responses tight: short headings, bullets, under ~200 words unless asked for a plan. Markdown.

USER DATA (last 30 days):
${JSON.stringify(context ?? {}, null, 2)}`;

        try {
          const result = streamText({
            model,
            system,
            messages: await convertToModelMessages(messages),
          });
          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (e: any) {
          console.error("chat error", e);
          return new Response(e?.message ?? "AI error", { status: 500 });
        }
      },
    },
  },
});
