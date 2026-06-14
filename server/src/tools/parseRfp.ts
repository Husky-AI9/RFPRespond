import { z } from "zod";

export const ParseRfpInput = z.object({
  fileUrl: z.string().url().describe("SharePoint download URL for the RFP PDF"),
  accessToken: z.string().describe("Graph access token for file download"),
});

export type RfpQuestion = {
  id: string;
  section: string;
  question: string;
};

export async function parseRfp(
  fileUrl: string,
  accessToken: string
): Promise<{ questions: RfpQuestion[]; totalCount: number }> {
  // Fetch the PDF bytes from SharePoint via Graph
  const response = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch RFP file: ${response.status} ${response.statusText}`);
  }

  const pdfBuffer = Buffer.from(await response.arrayBuffer());

  // Lazy-require pdf-parse to avoid its test file side-effects at module load
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require("pdf-parse");
  const { text } = await pdfParse(pdfBuffer);

  // Split text into atomic questions by common RFP numbering patterns
  // Matches: "1.", "1.1", "Q1.", "Question 1:", "Section A -", etc.
  const questionPattern = /(?:^|\n)(?:Q(?:uestion)?\s*\d+[\.\:]|(?:\d+\.)+\d*\s+|[A-Z]\d+\s*[\-\.]\s*)/gm;
  const splits = text.split(questionPattern).filter((s: string) => s.trim().length > 20);

  // Derive section headings from lines that look like headings (ALL CAPS, no trailing ?)
  const sectionPattern = /^([A-Z][A-Z\s&]{4,})$/m;

  const questions: RfpQuestion[] = splits.slice(0, 150).map((raw: string, idx: number) => {
    const sectionMatch = raw.match(sectionPattern);
    const section = sectionMatch ? sectionMatch[1].trim() : `Section ${Math.floor(idx / 10) + 1}`;
    const questionText = raw.replace(sectionPattern, "").trim().split("\n")[0].trim();
    return {
      id: `q-${String(idx + 1).padStart(3, "0")}`,
      section,
      question: questionText || raw.trim().substring(0, 200),
    };
  });

  return { questions, totalCount: questions.length };
}
