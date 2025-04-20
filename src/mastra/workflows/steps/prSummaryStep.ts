import { CoreMessage, Step, StepExecutionContext } from "@mastra/core";
import { prSummaryAgent, PrSummarySchema } from "../../agents/prSummaryAgent.js";
import { truncateDiffSafely } from "../../../utilities/formatting.js";
import * as config from "../../../config.js";
import { workflowState } from "../workflowState.js";

/** Identifier string for the prSummary workflow step. */
export const prSummaryStepId = "prSummaryStep";

/**
 * Mastra workflow step to generate a summary for a pull request.
 * It gathers context (PR diff, PR details, Jira ticket info) from the workflowState singleton,
 * constructs a prompt for the `prSummaryAgent`, handles potential
 * diff truncation based on configuration, invokes the agent
 * to produce a structured summary object, and stores the result back in the singleton.
 */
export const prSummaryStep = new Step({
    id: prSummaryStepId,
    outputSchema: PrSummarySchema,
    execute: async () => {
        const originalDiff = workflowState.get("prDiff");
        const prDetails = workflowState.get("prDetails");
        const jiraInfo = workflowState.get("jiraTicketInfo");

        if (!originalDiff) {
            throw new Error("Could not retrieve PR diff from workflow state.");
        }
        if (!prDetails) {
            throw new Error("Could not retrieve PR details from workflow state.");
        }

        const prTitle = prDetails.prTitle ?? "Unknown Title";
        const branchName = prDetails.branchName ?? "unknown-branch";
        const prDescription = prDetails.prDescription ?? "";
        const commitMessages = prDetails.commitMessages ?? "Could not retrieve commit messages.";
        const jiraSummary = jiraInfo?.summary;
        const jiraDescription = jiraInfo?.description;

        const MAX_DIFF_CHARS = config.MAX_DIFF_CHARS;
        console.log(`Using MAX_DIFF_CHARS from config: ${MAX_DIFF_CHARS}`);

        const { truncatedDiff: processedDiff, wasTruncated: diffWasClipped } = truncateDiffSafely(originalDiff, MAX_DIFF_CHARS);

        if (diffWasClipped) {
            console.warn(`Diff length (${originalDiff.length}) exceeded limit (${MAX_DIFF_CHARS}). Clipped safely to ${processedDiff.length} characters.`);
        }

        const clippingWarning = diffWasClipped
            ? "\n\n**Note:** The full Pull Request diff was too large to analyse and has been truncated. The results below are based on the initial part of the changes.\n"
            : "";

        const userMessageContent = `Summarise the following Pull Request:

PR Title: ${prTitle}
Branch Name: ${branchName}

PR Description:
${prDescription || "<No description provided>"}

${jiraSummary && jiraDescription ? `---\n<JiraContext>:\nSummary: ${jiraSummary}\nDescription:\n\`\`\`adf\n${jiraDescription}\n\`\`\`\n</JiraContext>` : ""}

---
Commit Messages:
${commitMessages}
---

${clippingWarning}PR Diff:
\`\`\`diff
${processedDiff}
\`\`\``;

        const messages: CoreMessage[] = [
           { role: "user", content: userMessageContent }
        ];

        try {
            const result = await prSummaryAgent.generate(
                messages,
                {
                    output: PrSummarySchema,
                    temperature: config.MODEL_TEMPERATURE
                }
            );

            if (!result || !result.object) {
                throw new Error("AI generation did not return the expected object structure for summary.");
            }
            console.log("Received summary object from agent:", result.object);

            workflowState.set("prSummary", result.object);

            return result.object;

        } catch (error) {
             console.error("Error during summary agent generation:", error);
             throw error;
        }
    }
});