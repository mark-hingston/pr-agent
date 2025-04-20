import { CoreMessage, Step, StepExecutionContext } from "@mastra/core";
import { prReviewerAgent, PrReviewSchema, PrReview } from "../../agents/prReviewerAgent.js";
import { truncateDiffSafely } from "../../../utilities/formatting.js";
import * as config from "../../../config.js";
import { workflowState } from "../workflowState.js";

/** Identifier string for the prReview workflow step. */
export const prReviewStepId = "prReviewStep";

/**
 * Mastra workflow step to generate a code review for a pull request.
 * It gathers context (PR diff, PR details, Jira ticket info) from the workflowState singleton,
 * constructs a prompt for the `prReviewerAgent`, handles potential
 * diff truncation based on configuration, invokes the agent
 * to produce a structured review object, and stores the result back in the singleton.
 */
export const prReviewStep = new Step({
    id: prReviewStepId,
    outputSchema: PrReviewSchema,
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

        const userMessageContent = `Review the following Pull Request:

PR Title: ${prTitle}
Branch Name: ${branchName}

PR Description:
${prDescription || "<No description provided>"}

${jiraSummary && jiraDescription ? `---\nJira Context:\nSummary: ${jiraSummary}\nDescription:\n\`\`\`adf\n${jiraDescription}\n\`\`\`\n---` : ""}

---
Commit Messages:
${commitMessages}
---

${clippingWarning}PR Diff:
\`\`\`diff
${processedDiff}
\`\`\``;

        console.log("User message content for review agent:", userMessageContent);

        const messages: CoreMessage[] = [
            { role: "user", content: userMessageContent }
        ];

        try {
            const result = await prReviewerAgent.generate(
                messages,
                {
                    output: PrReviewSchema,
                    temperature: config.MODEL_TEMPERATURE
                }
            );

             if (!result || !result.object) {
                 throw new Error("AI generation did not return the expected object structure for review.");
             }
            console.log("Received review object from agent:", result.object);

            workflowState.set("prReview", result.object);

            return result.object;

        } catch (error) {
             console.error("Error during agent generation:", error);
             throw error;
        }
    }
});