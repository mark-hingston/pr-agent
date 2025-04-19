import { Step } from "@mastra/core";
import { PrDetailsSchema, getPrDetails } from "../../../utilities/github.js";
import { workflowState } from "../workflowState.js"; // Import the singleton

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
        console.log("Fetched PR Details:", prDetails);
        workflowState.set("prDetails", prDetails); // Store in singleton
        return prDetails;
    }
});