import { Step } from "@mastra/core";
import { PrDetailsSchema, getPrDetails } from "../../../utilities/github.js";
import { workflowState } from "../workflowState.js";

/** Identifier string for the getPrDetails workflow step. */
export const getPrDetailsStepId = "getPrDetails";

/**
 * Mastra workflow step to fetch essential details about the current pull request
 * from the GitHub context, such as PR number, owner, repo, and branch name.
 */
export const getPrDetailsStep = new Step({
    id: getPrDetailsStepId,
    outputSchema: PrDetailsSchema,
    execute: async () => {
        const prDetails = await getPrDetails();
        workflowState.set("prDetails", prDetails);
        return prDetails;
    }
});