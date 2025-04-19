import { Step, StepExecutionContext } from "@mastra/core";
import { z } from "zod";
import { getPrDiff } from "../../../utilities/github.js";
import * as config from "../../../config.js";
import { workflowState } from "../workflowState.js"; // Import the singleton

/** Identifier string for the getPrDiff workflow step. */
export const getPrDiffStepId = "getPrDiff";

/**
 * Mastra workflow step to fetch the diff content of the current pull request.
 * It respects ignore patterns defined in the configuration to exclude certain files.
 */
export const getPrDiffStep = new Step({
    id: getPrDiffStepId,
    outputSchema: z.object({
        diff: z.string()
    }),
    execute: async () => {
        const ignorePatterns = config.IGNORE_PATTERNS;

        if (ignorePatterns && ignorePatterns.length > 0) {
            console.log(`Using ignore patterns from config: ${JSON.stringify(ignorePatterns)}`);
        } else {
            console.log("No IGNORE_PATTERNS configured. Getting diff for all files.");
        }

        const diff = await getPrDiff(ignorePatterns);
        workflowState.set("prDiff", diff); // Store in singleton
        return { diff };
    }
});