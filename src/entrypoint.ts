// In src/entrypoint.ts or early in github.ts
console.log("--- Debug Environment ---");
console.log("GITHUB_EVENT_PATH:", process.env.GITHUB_EVENT_PATH);
console.log("GITHUB_EVENT_NAME:", process.env.GITHUB_EVENT_NAME);
console.log("GITHUB_REPOSITORY:", process.env.GITHUB_REPOSITORY);
console.log("GITHUB_SHA:", process.env.GITHUB_SHA);
console.log("--- End Debug ---");

// Also try reading the event file directly
if (process.env.GITHUB_EVENT_PATH) {
  try {
    const fs = await import('fs'); // Use dynamic import for fs
    const eventPayload = fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8');
    console.log("Event Payload Content:", eventPayload);
  } catch (err) {
    console.error("Error reading event payload:", err);
  }
}

/**
 * Main entry point for the PR Agent GitHub Action.
 * Imports the main workflow, creates a run instance, and starts its execution.
 */
import { prAgentWorkflow } from "./mastra/workflows/prAgentWorkflow.js";

const { runId, start } = prAgentWorkflow.createRun();

await start();