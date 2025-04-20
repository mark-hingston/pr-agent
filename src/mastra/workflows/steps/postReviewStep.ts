import { Step } from "@mastra/core";
import { z } from "zod";
import { postPrComment, getIssueComments, editIssueComment } from "../../../utilities/github.js";
import { formatReviewToMarkdown } from "../../../utilities/formatting.js";
import { GITHUB_ACTIONS_BOT_LOGIN, GITHUB_BOT_COMMENT_MARKER } from "../../../utilities/constants.js";
import { workflowState } from "../workflowState.js";

/** Identifier string for the postReview workflow step. */
export const postReviewStepId = "postReviewStep";

/**
 * Zod schema for the output of the postReviewStep, indicating whether a comment
 * was posted/edited, the comment ID (if applicable), and the action taken.
 */
const OutputSchema = z.object({
    posted: z.boolean(),
    comment_id: z.number().optional(),
    action_taken: z.enum(["created", "edited", "skipped", "error"])
});


/**
 * Mastra workflow step to format the generated PR review (from workflowState)
 * into Markdown and post it as a comment on the GitHub pull request.
 * It checks for existing comments by the 'github-actions[bot]' user containing
 * the bot marker and edits the latest one if found, otherwise creates a new comment.
 */
export const postReviewStep = new Step({
    id: postReviewStepId,
    outputSchema: OutputSchema,
    execute: async (): Promise<z.infer<typeof OutputSchema>> => {
        console.log("Executing Format & Post Review Step");
        const reviewResult = workflowState.get("prReview");

        if (!reviewResult) {
            console.warn("No review result found in workflow state. Skipping post.");
            return { posted: false, action_taken: "skipped" };
        }

        let markdownComment = formatReviewToMarkdown(reviewResult);
        markdownComment += `\n${GITHUB_BOT_COMMENT_MARKER}`; // Add marker for future identification
        console.log("Formatted Review Markdown:\n", markdownComment);

        try {
            const existingComments = await getIssueComments();

            // Find the latest comment made by the GitHub Actions bot containing the marker.
            const previousComment = existingComments
                // MODIFIED: Filter by BOTH the bot login and the marker
                .filter(comment =>
                    comment.user?.login === GITHUB_ACTIONS_BOT_LOGIN &&
                    comment.body?.includes(GITHUB_BOT_COMMENT_MARKER)
                )
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort newest first
                [0]; // Get the latest one

            if (previousComment) {
                console.log(`Found previous review comment (ID: ${previousComment.id}) by ${GITHUB_ACTIONS_BOT_LOGIN} with marker. Editing.`);
                await editIssueComment(previousComment.id, markdownComment);
                return { posted: true, comment_id: previousComment.id, action_taken: "edited" };
            } else {
                console.log(`No previous review comment by ${GITHUB_ACTIONS_BOT_LOGIN} with marker found. Creating new comment.`);
                await postPrComment(markdownComment);
                // The comment ID of the *newly created* comment isn't easily available here without another API call,
                // but the output schema makes comment_id optional, which is fine.
                return { posted: true, action_taken: "created" };
            }
        } catch (error) {
            console.error("Failed during review comment posting/editing:", error);
            return { posted: false, action_taken: "error" };
        }
    }
});