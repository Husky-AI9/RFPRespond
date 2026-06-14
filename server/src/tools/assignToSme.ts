import { z } from "zod";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

export const AssignToSmeInput = z.object({
  questionId: z.string().describe("RFP question identifier (e.g. q-007)"),
  question: z.string().describe("Full text of the question to be reviewed"),
  userId: z.string().describe("Entra object ID of the SME to assign"),
  planId: z.string().optional().describe("Planner plan ID (defaults to env var PLANNER_PLAN_ID)"),
  accessToken: z.string().describe("Graph access token (Tasks.ReadWrite scope)"),
});

export type PlannerTaskResult = {
  taskId: string;
  taskUrl: string;
  assignedTo: string;
  dueDate: string;
};

export async function assignToSme(
  questionId: string,
  question: string,
  userId: string,
  accessToken: string,
  planId?: string
): Promise<PlannerTaskResult> {
  const resolvedPlanId = planId ?? process.env.PLANNER_PLAN_ID!;

  const graphClient = Client.init({
    authProvider: (done) => done(null, accessToken),
  });

  // Due date = 3 business days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);
  const dueDateIso = dueDate.toISOString().split("T")[0] + "T17:00:00Z";

  const taskBody = {
    planId: resolvedPlanId,
    title: `[RFP Review] ${questionId}: ${question.substring(0, 80)}`,
    dueDateTime: dueDateIso,
    assignments: {
      [userId]: {
        "@odata.type": "#microsoft.graph.plannerAssignment",
        orderHint: " !",
      },
    },
    details: {
      description: `Please review and approve the drafted answer for the following RFP question:\n\n${question}\n\nQuestionID: ${questionId}`,
    },
  };

  const task = await graphClient.api("/planner/tasks").post(taskBody);
  const taskId: string = task.id;

  // Build a stable Planner deep-link
  const taskUrl = `https://tasks.office.com/tasks/${taskId}`;

  return {
    taskId,
    taskUrl,
    assignedTo: userId,
    dueDate: dueDateIso,
  };
}
