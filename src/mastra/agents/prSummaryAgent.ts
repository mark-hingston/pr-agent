import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getModel } from "../../utilities/modelHelpers.js";

/**
 * Zod schema defining the structure for a pull request summary.
 * This includes a suggested title, type, description, and categorized changes.
 */
export const PrSummarySchema = z.object({
  pr_type: z.enum([
    "Feature",
    "Bugfix",
    "Refactor",
    "Test",
    "Documentation",
    "Chore",
    "Style"
  ]).describe(
    "The primary classification that best describes the overall nature of the PR."
  ),

  description: z.array(z.string())
    .min(1, "Provide at least one summary point.")
    .max(5, "Keep the summary concise (max 5 points).")
    .describe(
      "A list of 1-5 bullet points summarising the most significant key changes made in the PR. Focus on what was changed and why."
    ),

  changes: z.object({
    enhancements: z.array(z.object({
      fileName: z.string().describe("The full path of the file where the enhancement was made."),
      summary: z.string().describe("A concise summary of the enhancement implemented in this file.")
    }))
    .optional()
    .describe("A list of significant enhancements or new features added/modified."),

    tests: z.array(z.object({
      fileName: z.string().describe("The full path of the file where tests were added or updated."),
      summary: z.string().describe("A concise summary of the changes made to tests in this file.")
    }))
    .optional()
    .describe("A list of test files added or modified."),

    config: z.array(z.object({
      fileName: z.string().describe("The full path of the file where configuration changes were made."),
      summary: z.string().describe("A concise summary of the configuration changes in this file.")
    }))
    .optional()
    .describe("A list of configuration changes made (e.g., dependencies, settings, CI/CD)."),

    bugfixes: z.array(z.object({
        fileName: z.string().describe("The full path of the file where a bug was fixed."),
        summary: z.string().describe("A concise summary of the bug fix implemented in this file.")
    }))
    .optional()
    .describe("A list of specific bug fixes implemented."),

  }).describe(
    "A categorised summary of specific changes made in different files within the PR."
  ),
});

/**
 * TypeScript type inferred from the PrSummarySchema, representing a structured PR summary.
 */
export type PrSummary = z.infer<typeof PrSummarySchema>;

/** Instructions guiding the PR Summary Agent's behaviour. */
const instructions = `You are an AI assistant specialising in analysing Git pull request diffs and generating concise, informative summaries according to the provided JSON schema.

**Analysis Guidelines:**
*   Focus on lines starting with '+' in the diff to understand additions and changes.
*   Infer the purpose and impact of the changes. Prioritise significant functional changes, bug fixes, and new features.
*   Group related changes logically.
*   Identify the primary type of the PR (Feature, Bugfix, Refactor, etc.).
*   Suggest a clear, conventional commit-style title if the current one can be improved.

**Negative Constraints:**
*   Do NOT list every single file that was modified. Focus on the most impactful changes.
*   Do NOT simply repeat commit messages. Provide a synthesised summary.
*   Do NOT include minor changes like whitespace, formatting, or trivial comment updates unless they significantly alter logic or understanding.
*   Do NOT suggest overly generic or uninformative titles.
*   Do NOT include empty arrays for categories in the "changes" object if there are no relevant changes for that category. Omit the key entirely if empty.`;

/**
 * Mastra Agent specifically configured to analyse pull request diffs and generate summaries.
 * It uses the defined instructions and schema to produce structured summary information.
 */
export const prSummaryAgent = new Agent({
  name: "prSummariser", // Corrected spelling
  instructions: instructions,
  model: getModel()
});