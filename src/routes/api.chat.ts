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

        const system = `You are "Momentum Coach", a sharp, kind, no-fluff personal-growth coach.
You can see the user's habit data below as JSON. Give grounded, specific answers — cite numbers and habit names from the data. Be honest about regressions. Keep responses tight (under ~180 words unless asked for a plan). Use short headings and bullet points when helpful.

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
