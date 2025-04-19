import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";
import { prAgentWorkflow } from "./workflows/prAgentWorkflow.js";
import { prSummaryAgent } from "./agents/prSummaryAgent.js";
import { prReviewerAgent } from "./agents/prReviewerAgent.js";

/**
 * The main Mastra instance configured for the PR Agent.
 * It includes the core workflow and the necessary agents for summarisation and review.
 */
export const mastra = new Mastra({
  workflows: { prAgentWorkflow },
  agents: { prSummaryAgent, prReviewerAgent },
  logger: createLogger({
    name: "PR Agent",
    level: "info",
  }),
});