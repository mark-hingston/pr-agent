/**
 * Main entry point for the PR Agent GitHub Action.
 * Imports the main workflow, creates a run instance, and starts its execution.
 */
import { prAgentWorkflow } from "./mastra/workflows/prAgentWorkflow.js";

const { runId, start } = prAgentWorkflow.createRun();

await start();