import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getModel } from "../../utilities/modelHelpers.js";

/**
 * Zod schema defining the structure for a single feedback point within a PR review.
 */
export const FeedbackPointSchema = z.object({
  description: z.string().describe("Clear description of the issue or suggestion."),
  file_path: z.string().describe("The relevant file path."),
  line_reference: z.string().optional().describe("Approximate line number(s) or range (e.g., \"line 42\", \"lines 50-55\"). Optional."),
  severity: z.enum(["Critical", "High", "Medium", "Low", "Info"]).optional().describe("Estimated severity or importance."),
  suggested_code_change: z.string().optional().describe("Optional: A small code snippet showing the suggested fix.")
});

/**
 * Zod schema defining the overall structure for a PR review response.
 */
export const PrReviewSchema = z.object({
  overall_assessment: z.string().describe("A brief (1-2 sentence) high-level assessment."),
  review_effort: z.enum(["Trivial", "Minor", "Moderate", "Significant", "Complex"])
      .describe("Estimated effort required to review this pull request's diff."),
  review_effort_reasoning: z.string().optional()
     .describe("Brief justification for the chosen review effort level (e.g., 'Small diff, simple test logic change')."),
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
*   **Primary Focus:** Your analysis and feedback MUST focus *exclusively* on the added or modified code lines (\`+\` lines) within the **PR Diff** provided below.
*   **Context for Interpretation:** Use the **PR description, commit messages, and Jira context** ONLY to understand the *intended purpose* of the code changes *you see in the diff*.
*   **Evaluate Visible Code:** Evaluate if the specific code *visible in the diff* logically contributes to the stated goals from the context. Identify potential issues (bugs, performance, security, readability, tests, best practices) *within the changed code itself*.
*   Provide constructive, specific, and actionable feedback.
*   Prioritise significant issues over minor stylistic preferences (unless explicitly configured otherwise). Issues related to unmet requirements are generally significant.
*   Estimate the effort required to review the PR by choosing one of the following labels: "Trivial", "Minor", "Moderate", "Significant", "Complex". **Base this choice primarily on the size and complexity of the changes *within the provided diff*.** Use the following guidelines:
    *   **"Trivial":** Very small changes (e.g., < 10-15 lines), typo fixes, simple config changes, adding straightforward tests. Requires minimal cognitive effort.
    *   **"Minor":** Small, localized changes (e.g., < 50 lines), simple bug fixes, minor refactoring within a single function, straightforward feature additions. Requires focused review but is easy to understand.
    *   **"Moderate":** Medium-sized changes (e.g., < 150-200 lines), changes spanning a few files, moderately complex logic changes, implementing a well-defined feature part. Requires careful reading and understanding of interactions.
    *   **"Significant":** Large changes (e.g., > 200 lines), complex refactoring, changes affecting core logic or multiple components, implementing a complex feature. Requires significant time and deep understanding.
    *   **"Complex":** Very large or extremely complex changes, major architectural shifts, introducing new paradigms or dependencies. Requires extensive review time and potentially domain expertise.
*   **Do NOT base the choice solely on the overall feature complexity described in Jira/context if the diff itself is small and simple.** Choose the label reflecting the effort needed to review *this specific code*, not the entire feature development.
*   **Provide a brief \`review_effort_reasoning\`** explaining your choice, focusing on the diff characteristics.
*   Acknowledge diff limitations (you only see code chunks, not the full file context).

**Negative Constraints:**
*   **CRITICAL:** Do NOT comment on code, files, or potential missing functionality if it was not part of the diff's additions/modifications (+ lines), even if implied by the context (Jira/Commits). All feedback points MUST link directly to a specific change visible in the diff.
*   Do NOT suggest purely stylistic changes unless they significantly impact readability (e.g., overly complex code). Avoid debates on tabs vs. spaces, etc.
*   Do NOT be overly nitpicky. Focus on meaningful improvements.
*   Do NOT provide generic feedback like "needs tests" without suggesting *what* kind of tests might be missing or where, **potentially referencing the requirements for test case ideas.**
*   Do NOT include more than 10 feedback points. Consolidate related minor issues if necessary.
*   Do NOT suggest adding type hints if the project doesn't use them or if it's outside the scope of the PR. (Example constraint - adjust as needed).
*   Focus feedback on the *implementation within the diff*, not on the requirements themselves (unless the *diff code* reveals a flaw/ambiguity in them).`;

/**
 * Mastra Agent specifically configured to perform code reviews on pull request diffs.
 * It uses the defined instructions and schema to generate structured feedback.
 */
export const prReviewerAgent = new Agent({
  name: "prReviewer",
  instructions: instructions,
  model: getModel()
});