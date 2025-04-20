import { z } from "zod";
import * as config from "../config.js";

/**
 * Zod schema representing the basic structure of a Jira Atlassian Document Format (ADF) object.
 * Used internally for parsing ticket descriptions.
 */
const AdfDocumentSchema = z.object({
  type: z.string(),
  version: z.number(),
  content: z.array(z.any())
});

/** TypeScript type inferred from AdfDocumentSchema. */
type AdfDocument = z.infer<typeof AdfDocumentSchema>;

/**
 * Zod schema representing the relevant parts of a Jira issue API response.
 * Used internally for parsing fetched ticket data.
 */
const JiraTicketSchema = z.object({
  fields: z.object({
    // Preprocess description: If it's an object (ADF), stringify it. Otherwise, pass through.
    description: z.preprocess(
      (val) => {
        if (typeof val === "object" && val !== null) {
          try {
            return JSON.stringify(val);
          } catch (error) {
            console.error("Error stringifying description:", error);
            return undefined; // Handle stringification error
          }
        }
        return val; // Pass through non-objects (null, undefined, string)
      },
      z.string().nullable().optional() // Expect a string, null, or undefined after preprocessing
    ),
    summary: z.string(),
  }),
});

/**
 * Retrieves Jira configuration (base URL and credentials) from the application config.
 * @throws {Error} If required Jira environment variables are not set.
 * @returns An object containing the Jira base URL and base64 encoded credentials.
 */
const getJiraConfig = () => {
  if (!config.JIRA_BASE_URL || !config.JIRA_EMAIL || !config.JIRA_API_TOKEN) {
    throw new Error(
      "Jira environment variables (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN) must be set.",
    );
  }

  const credentials = Buffer.from(`${config.JIRA_EMAIL}:${config.JIRA_API_TOKEN}`).toString("base64");

  return { jiraBaseUrl: config.JIRA_BASE_URL, credentials };
};

/**
 * Makes an authenticated request to the Jira API.
 * @param url - The full URL for the Jira API endpoint.
 * @param method - The HTTP method (e.g., "GET", "POST").
 * @param body - Optional request body for POST/PUT requests.
 * @throws {Error} If the API request fails or returns a non-OK status.
 * @returns A Promise resolving to the parsed JSON response from the Jira API.
 */
const makeJiraRequest = async (url: string, method: string, body?: any) => {
  const { credentials } = getJiraConfig();

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
    options.headers = {
      ...options.headers,
      "Content-Type": "application/json"
    };
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jira API request failed with status ${response.status}: ${errorText}`,
    );
  }

  return await response.json();
};

/**
 * Fetches specific fields (summary, description) for a given Jira ticket ID.
 * @param ticketId - The Jira issue key (e.g., "PROJECT-123").
 * @throws {Error} If fetching the ticket fails or the response validation fails.
 * @returns A Promise resolving to the parsed Jira ticket data (summary and stringified description).
 */
const getJiraTicket = async (ticketId: string) => {
  const { jiraBaseUrl } = getJiraConfig();
  const apiUrl = `${jiraBaseUrl}/rest/api/3/issue/${ticketId}?fields=summary,description`;

  try {
    const data = await makeJiraRequest(apiUrl, "GET");

    const parsed = JiraTicketSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Jira API response validation failed: ${parsed.error.message}`);
    }
    return parsed.data;
  } catch (error: any) {
    console.error(`Error fetching Jira ticket ${ticketId}:`, error);
    throw error;
  }
};

/**
 * Zod schema defining the structure for the processed Jira ticket information,
 * containing the summary and plain text description.
 */
export const JiraTicketInfoSchema = z.object({
  summary: z.string(),
  description: z.string(),
});

/**
 * TypeScript type inferred from JiraTicketInfoSchema, representing processed ticket info.
 */
export type JiraTicketInfo = z.infer<typeof JiraTicketInfoSchema>;

/**
 * Fetches Jira ticket details (summary and stringified description) for a given ticket ID.
 * @param ticketId - The Jira issue key (e.g., "PROJECT-123").
 * @throws {Error} If any step in fetching or processing the ticket info fails.
 * @returns A Promise resolving to an object containing the ticket summary and stringified description.
 */
export const getJiraTicketInfo = async (ticketId: string): Promise<JiraTicketInfo> => {
    console.log(`Fetching Jira ticket info for ${ticketId}`);
    try {
      const ticketData = await getJiraTicket(ticketId);
      // Description is already stringified by the preprocessing step in JiraTicketSchema
      const description = ticketData.fields.description ?? "";
      const summary = ticketData.fields.summary ?? "";

      return {
        summary,
        description,
      };
    } catch (error: any) {
      console.error(`Error processing Jira ticket info for ${ticketId}:`, error);
      throw error;
    }
};