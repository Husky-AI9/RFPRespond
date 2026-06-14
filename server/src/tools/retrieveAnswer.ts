import { z } from "zod";

export const RetrieveAnswerInput = z.object({
  question: z.string().min(5).describe("The RFP question to answer"),
  questionId: z.string().optional().describe("Optional question ID for tracking"),
});

export type RetrievalResult = {
  questionId: string;
  answer: string;
  citations: Array<{ title: string; url: string; excerpt: string }>;
  confidence: number;
  needsReview: boolean;
};

export async function retrieveAnswer(
  question: string,
  questionId = "unknown"
): Promise<RetrievalResult> {
  // FOUNDRY_IQ_ENDPOINT points at the Azure AI Search index, e.g.
  // https://<service>.search.windows.net/indexes/rfp-corpus
  const endpoint = process.env.FOUNDRY_IQ_ENDPOINT!;
  const apiKey = process.env.FOUNDRY_IQ_KEY!;

  // Free tier doesn't support semantic ranking, so use a standard keyword
  // (BM25) query against the index's searchable fields.
  const response = await fetch(`${endpoint}/docs/search?api-version=2023-11-01`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      search: question,
      queryType: "simple",
      searchFields: "title,section,content",
      select: "id,title,section,content,url",
      top: 5,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Knowledge base retrieval failed: ${response.status} — ${body}`);
  }

  const data = (await response.json()) as any;
  const docs: any[] = data.value ?? [];

  if (docs.length === 0) {
    return {
      questionId,
      answer: "No relevant information found in the knowledge base for this question.",
      citations: [],
      confidence: 0,
      needsReview: true,
    };
  }

  // Ground the answer in the top matching documents; the Copilot orchestrator
  // composes the final user-facing response from this content + citations.
  const top = docs.slice(0, 3);
  const answer = top
    .map((d) => {
      const section = d.section ? `[${d.section}] ` : "";
      return `${section}${(d.content ?? "").trim()}`;
    })
    .join("\n\n");

  const citations = top.map((d) => ({
    title: d.title ?? "Document",
    url: d.url ?? "",
    excerpt: (d.content ?? "").trim().slice(0, 200),
  }));

  // BM25 scores are unbounded; normalize the top score into a rough 0–1
  // confidence for the SME-review threshold.
  const topScore: number = docs[0]?.["@search.score"] ?? 0;
  const confidence = Math.round(Math.min(topScore / 8, 1) * 100) / 100;

  return {
    questionId,
    answer,
    citations,
    confidence,
    needsReview: confidence < 0.6,
  };
}
