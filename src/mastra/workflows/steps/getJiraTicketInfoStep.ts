import { Step, StepExecutionContext } from "@mastra/core/workflows";
import { getJiraTicketInfo, JiraTicketInfoSchema, JiraTicketInfo } from "../../../utilities/jira.js";
import { getPrDetailsStepId } from "./getPrDetailsStep.js";
import { PrDetails } from "../../../utilities/github.js";
import * as config from "../../../config.js";
import { workflowState } from "../workflowState.js";

/** Identifier string for the getJiraTicketInfo workflow step. */
export const getJiraTicketInfoStepId = "getJiraTicketInfo";

/**
 * Mastra workflow step to extract a Jira ticket ID from the PR branch name (if configured)
 * and fetch the corresponding ticket details from the Jira API.
 * Relies on the output of the "getPrDetailsStep".
 */
export const getJiraTicketInfoStep = new Step({
    id: getJiraTicketInfoStepId,
    outputSchema: JiraTicketInfoSchema,
    execute: async ({ context }: StepExecutionContext) => { // Added type for context
        const prDetailsFromState = workflowState.get("prDetails");
        const prDetailsFromContext = context.getStepResult<PrDetails>(getPrDetailsStepId);
        const prDetails = prDetailsFromState || prDetailsFromContext;

        if (!prDetails) {
            throw new Error("PR Details not found in workflow state or context.");
        }

        const branchName = prDetails.branchName;
        let extractedTicketId: string | null = null;
        let jiraInfo: JiraTicketInfo = { summary: "", description: "" };

        const jiraBranchRegex = config.JIRA_BRANCH_REGEX;

        console.log(`Attempting to extract ticket ID from branch: ${branchName}`);
        if (jiraBranchRegex) {
            console.log(`Using regex from config: ${config.JIRA_BRANCH_REGEX_STR}`);
            try {
                const match = branchName.match(jiraBranchRegex);

                if (match && match.length > 1) {
                    extractedTicketId = match[1];
                    console.log(`Extracted ticket ID using regex: ${extractedTicketId}`);
                } else {
                    console.log("Regex did not match or find a capturing group. Skipping Jira fetch.");
                }
            } catch (error) {
                console.error(`Error matching Jira ticketId using regex "${config.JIRA_BRANCH_REGEX_STR}": ${error}. Skipping Jira fetch.`);
            }
        } else {
            console.log("No JIRA_BRANCH_REGEX configured. Skipping Jira fetch.");
        }

        if (extractedTicketId) {
            try {
                // TODO: Use the actual extractedTicketId, not a hardcoded one
                jiraInfo = await getJiraTicketInfo(extractedTicketId);
                // jiraInfo = await getJiraTicketInfo("PAY-2759"); // Keep hardcoded for now if needed for testing
            } catch (error) {
                 console.error(`Failed to fetch Jira ticket info for ${extractedTicketId}:`, error);
                 throw new Error(`Failed to fetch Jira ticket info for ${extractedTicketId}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        workflowState.set("jiraTicketInfo", jiraInfo);
        return jiraInfo;
    }
});