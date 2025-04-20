import { Workflow, Step } from "@mastra/core/workflows";
import { getJiraTicketInfoStep } from "./steps/getJiraTicketInfoStep.js";
import { getPrDetailsStep } from "./steps/getPrDetailsStep.js";
import { getPrDiffStep } from "./steps/getPrDiffStep.js";
import { prSummaryStep } from "./steps/prSummaryStep.js";
import { prReviewStep } from "./steps/prReviewStep.js";
import { updateSummaryStep } from "./steps/updateSummaryStep.js";
import { postReviewStep } from "./steps/postReviewStep.js";
import * as config from "../../config.js";

/** Reads enabled actions from configuration. */
const getActions = (): Set<string> => new Set<string>(config.PR_AGENT_ACTIONS);
/** Set of enabled actions based on configuration. */
const actions = getActions();

/** Checks if the "summary" action is enabled. */
const shouldGenerateSummary = async (): Promise<boolean> => actions.has("summary");
/** Checks if the "review" action is enabled. */
const shouldGenerateReview = async (): Promise<boolean> => actions.has("review");
/** Checks if Jira integration is configured. */
const hasJiraConfig = async (): Promise<boolean> => config.IS_JIRA_CONFIGURED;

/** Placeholder step for when Jira integration is skipped. */
const jiraNoOpStep = new Step({ id: "jiraNoOp", execute: async () => ({}) });
/** Placeholder step for when summary generation is skipped. */
const summaryNoOpStep = new Step({ id: "summaryNoOp", execute: async () => ({}) });
/** Placeholder step for when review generation is skipped. */
const reviewNoOpStep = new Step({ id: "reviewNoOp", execute: async () => ({}) });

/** Workflow containing only the step to get Jira ticket info. */
const getJiraTicketInfoWorkflow = new Workflow({ name: "getJiraTicketInfoWorkflowSingle" }).step(getJiraTicketInfoStep).commit();
/** Workflow containing only the Jira No-Op step. */
const jiraNoOpWorkflow = new Workflow({ name: "jiraNoOpWorkflowSingle" }).step(jiraNoOpStep).commit();
/** Workflow containing only the Summary No-Op step. */
const summaryNoOpWorkflow = new Workflow({ name: "summaryNoOpWorkflowSingle" }).step(summaryNoOpStep).commit();
/** Workflow containing only the Review No-Op step. */
const reviewNoOpWorkflow = new Workflow({ name: "reviewNoOpWorkflowSingle" }).step(reviewNoOpStep).commit();

/** Workflow sequence for generating and posting the PR summary. */
const summaryWorkflow = new Workflow({ name: "summarySequenceWorkflow" })
  .step(prSummaryStep)
  .then(updateSummaryStep)
  .commit();

/** Workflow sequence for generating and posting the PR review. */
const reviewSequenceWorkflow = new Workflow({ name: "reviewSequenceWorkflow" })
  .step(prReviewStep)
  .then(postReviewStep)
  .commit();

/** Identifier for the main PR Agent workflow. */
export const getPrAgentWorkflowId = "prAgentWorkflow";

/**
 * The main Mastra workflow for the PR Agent.
 * Orchestrates fetching PR details, optionally getting Jira info, fetching the diff,
 * and conditionally generating/posting summaries and reviews based on configuration.
 */
export const prAgentWorkflow = new Workflow({
  name: getPrAgentWorkflowId,
})
  .step(getPrDetailsStep) // Get PR Details first
  .if(hasJiraConfig, getJiraTicketInfoWorkflow, jiraNoOpWorkflow) // Then conditionally get Jira info
  .step(getPrDiffStep) // Then get the diff (waits for Jira branch)
  .if(shouldGenerateSummary, summaryWorkflow, summaryNoOpWorkflow) // Then conditionally generate summary
  .if(shouldGenerateReview, reviewSequenceWorkflow, reviewNoOpWorkflow) // Then conditionally generate review
  .commit();