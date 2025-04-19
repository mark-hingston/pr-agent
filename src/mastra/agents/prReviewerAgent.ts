import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getModel } from "../../utilities/modelHelpers.js";

/**
 * Zod schema defining the structure for a single feedback point within a PR review.
 */
export const FeedbackPointSchema = z.object({
  description: z.string().describe("Clear description of the issue or suggestion."),
  file_path: z.string().describe("The relevant file path."),
  line_reference: z.string().optional().describe("Approximate line number(s) or range (e.g., 'line 42', 'lines 50-55'). Optional."),
  severity: z.enum(["Critical", "High", "Medium", "Low", "Info"]).optional().describe("Estimated severity or importance."),
  suggested_code_change: z.string().optional().describe("Optional: A small code snippet showing the suggested fix.")
});

/**
 * Zod schema defining the overall structure for a PR review response.
 */
export const PrReviewSchema = z.object({
  overall_assessment: z.string().describe("A brief (1-2 sentence) high-level assessment."),
  review_effort: z.number().min(1).max(5).describe("Amount of effort required to review this pull request (1-5)"),
  feedback_points: z.array(FeedbackPointSchema)
    .max(10)
    .describe("A list of specific feedback points or suggestions."),
  security_concerns: z.array(z.string()).describe("List of identified security concerns, or empty if none."),
  test_coverage_assessment: z.string().optional().describe("Comment on test coverage.")
});

/**
 * TypeScript type inferred from the PrReviewSchema, representing a structured PR review.
 */
export type PrReview = z.infer<typeof PrReviewSchema>;

/** Instructions guiding the PR Reviewer Agent's behaviour. */
const instructions = `You are an AI assistant performing code reviews on Git pull request diffs, generating feedback according to the provided JSON schema.

**Review Guidelines:**
*   Analyse the provided PR diff and context (if available). Focus ONLY on added or modified code (+ lines).
*   Identify potential issues related to bugs, performance bottlenecks, security vulnerabilities, poor readability, lack of tests, or deviations from common best practices.
*   Provide constructive, specific, and actionable feedback.
*   Prioritise significant issues over minor stylistic preferences (unless explicitly configured otherwise).
*   Estimate the effort required to review the PR on a scale of 1 (trivial) to 5 (complex).
*   Acknowledge diff limitations (you only see code chunks, not the full file context).

**Negative Constraints:**
*   Do NOT comment on code that was not part of the diff's additions/modifications (+ lines).
*   Do NOT suggest purely stylistic changes unless they significantly impact readability (e.g., overly complex code). Avoid debates on tabs vs. spaces, etc.
*   Do NOT be overly nitpicky. Focus on meaningful improvements.
*   Do NOT provide generic feedback like "needs tests" without suggesting *what* kind of tests might be missing or where.
*   Do NOT include more than 10 feedback points. Consolidate related minor issues if necessary.
*   Do NOT suggest adding type hints if the project doesn't use them or if it's outside the scope of the PR. (Example constraint - adjust as needed).`;
 
 
/**
 * Mastra Agent specifically configured to perform code reviews on pull request diffs.
 * It uses the defined instructions and schema to generate structured feedback.
 */
export const prReviewerAgent = new Agent({
  name: "prReviewer",
  instructions: instructions,
  model: getModel()
});