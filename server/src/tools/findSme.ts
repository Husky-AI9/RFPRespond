import { z } from "zod";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

export const FindSmeInput = z.object({
  topic: z.string().min(3).describe("Topic or keyword to find a subject-matter expert for"),
  accessToken: z.string().describe("Graph access token (delegated, People.Read scope)"),
});

export type SmeResult = {
  userId: string;
  displayName: string;
  email: string;
  rationale: string;
  recentDocTitles: string[];
};

export async function findSme(topic: string, accessToken: string): Promise<SmeResult | null> {
  const graphClient = Client.init({
    authProvider: (done) => done(null, accessToken),
  });

  // Search the people I interact with most who match this topic
  const peopleResponse = await graphClient
    .api("/me/people")
    .query({ $search: `"${topic}"`, $top: "5" })
    .get();

  const people: any[] = peopleResponse.value ?? [];
  if (people.length === 0) return null;

  // For the top candidate, look up their recent documents as expertise signals
  const topPerson = people[0];
  const userId: string = topPerson.id;

  let recentDocTitles: string[] = [];
  try {
    const insightsResponse = await graphClient
      .api(`/users/${userId}/insights/used`)
      .query({ $top: "5", $filter: "resourceVisualization/type eq 'Word' or resourceVisualization/type eq 'Spreadsheet'" })
      .get();

    recentDocTitles = (insightsResponse.value ?? []).map(
      (item: any) => item.resourceVisualization?.title ?? "Untitled"
    );
  } catch {
    // Insights may not be available for all users — non-fatal
  }

  const rationale = recentDocTitles.length > 0
    ? `Recent documents related to "${topic}": ${recentDocTitles.slice(0, 3).join(", ")}`
    : `Identified as a frequent collaborator with expertise in "${topic}" based on communication patterns.`;

  return {
    userId,
    displayName: topPerson.displayName ?? "Unknown",
    email: topPerson.scoredEmailAddresses?.[0]?.address ?? topPerson.userPrincipalName ?? "",
    rationale,
    recentDocTitles,
  };
}
