import { Step } from "@mastra/core";
import { z } from "zod";
import { updatePrDescription } from "../../../utilities/github.js";
import { formatSummaryToMarkdown } from "../../../utilities/formatting.js";
import { GITHUB_SUMMARY_START_MARKER, GITHUB_SUMMARY_END_MARKER } from "../../../utilities/constants.js";
import { workflowState } from "../workflowState.js";

/** Identifier string for the updateSummary workflow step. */
export const updateSummaryStepId = "updateSummaryStep";

/**
 * Zod schema for the output of the updateSummaryStep, indicating whether
 * the PR description was successfully updated.
 */
const OutputSchema = z.object({ updated: z.boolean() });


/**
 * Mastra workflow step to format the generated PR summary (from workflowState)
 * into Markdown and update the GitHub pull request description.
 * It preserves any user-added content outside the previous summary markers.
 */
export const updateSummaryStep = new Step({
    id: updateSummaryStepId,
    outputSchema: OutputSchema,
    execute: async () => {
        console.log("Executing Format & Update Summary Step");
        const summaryResult = workflowState.get("prSummary");
        const prDetails = workflowState.get("prDetails");
        const originalPrDescription = prDetails?.prDescription ?? "";

        if (!summaryResult) {
            console.warn("No summary result found in workflow state. Skipping update.");
            return { updated: false };
        }
        if (!prDetails) {
            console.warn("PR Details not found in workflow state. Skipping update.");
            return { updated: false };
        }

        const newMarkdownSummary = formatSummaryToMarkdown(summaryResult);
        console.log("Formatted New Summary Markdown:\n", newMarkdownSummary);

        // Preserve user content outside the markers
        let userContent = originalPrDescription;
        const markerStartIdx = originalPrDescription.indexOf(GITHUB_SUMMARY_START_MARKER);
        const markerEndIdx = originalPrDescription.indexOf(GITHUB_SUMMARY_END_MARKER);

        if (markerStartIdx !== -1 && markerEndIdx !== -1 && markerEndIdx > markerStartIdx) {
            userContent = originalPrDescription.substring(0, markerStartIdx).trim();
            console.log("Found previous summary markers. Preserving content before them.");
        } else {
            console.log("No previous summary markers found. Using full original description as user content.");
            userContent = originalPrDescription.trim();
        }

        const separator = userContent ? "\n\n---\n\n" : ""; // Add extra newline for spacing
        const finalBody = `${userContent}${separator}${GITHUB_SUMMARY_START_MARKER}\n${newMarkdownSummary}\n${GITHUB_SUMMARY_END_MARKER}`;


        try {
            await updatePrDescription(finalBody.trim());
            return { updated: true };
        } catch (error) {
            console.error("Failed to update PR description:", error);
            return { updated: false };
        }
    }
});