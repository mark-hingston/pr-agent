import * as dotenv from "dotenv";
dotenv.config();

// --- GitHub Configuration ---
/** GitHub token for API authentication. Required for most operations. */
export const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    console.warn("GITHUB_TOKEN environment variable is not set. Some operations may fail.");
}

// --- Model Configuration ---
/** Specifies the AI model provider to use (e.g., "openai", "azure", "anthropic", "google", "openai-compatible"). */
export const MODEL_PROVIDER = process.env.MODEL_PROVIDER;

// OpenAI
/** API key for OpenAI services. Required if MODEL_PROVIDER is "openai". */
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
/** Specific OpenAI model identifier (e.g., "gpt-4-turbo"). Required if MODEL_PROVIDER is "openai" or "openai-compatible". */
export const OPENAI_MODEL = process.env.OPENAI_MODEL;
/** Base URL for OpenAI-compatible API endpoints. Required if MODEL_PROVIDER is "openai-compatible". */
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;

// Azure OpenAI
/** API key for Azure OpenAI services. Required if MODEL_PROVIDER is "azure". */
export const AZURE_API_KEY = process.env.AZURE_API_KEY;
/** Azure OpenAI resource name. Required if MODEL_PROVIDER is "azure". */
export const AZURE_OPENAI_RESOURCE = process.env.AZURE_OPENAI_RESOURCE;
/** Azure OpenAI deployment name. Required if MODEL_PROVIDER is "azure". */
export const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;

// Anthropic
/** API key for Anthropic services. Required if MODEL_PROVIDER is "anthropic". */
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
/** Specific Anthropic model identifier (e.g., "claude-3-opus-20240229"). Required if MODEL_PROVIDER is "anthropic". */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL;

// Google
/** API key for Google AI services. Required if MODEL_PROVIDER is "google". */
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
/** Specific Google model identifier (e.g., "gemini-pro"). Required if MODEL_PROVIDER is "google". */
export const GOOGLE_MODEL = process.env.GOOGLE_MODEL;

// --- Jira Configuration ---
/** Base URL for the Jira instance (e.g., "https://your-domain.atlassian.net"). */
export const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
/** Email address associated with the Jira API token. */
export const JIRA_EMAIL = process.env.JIRA_EMAIL;
/** Jira API token for authentication. */
export const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
/** String representation of the regex used to extract Jira ticket IDs from branch names. */
export const JIRA_BRANCH_REGEX_STR = process.env.JIRA_BRANCH_REGEX;

// --- PR Agent Configuration ---
/** JSON string representing an array of enabled PR agent actions (e.g., "[\"summary\", \"review\"]"). Defaults to "[]". */
export const PR_AGENT_ACTIONS_JSON = process.env.PR_AGENT_ACTIONS || "[]";
/** String representation of the maximum number of characters allowed for a PR diff. */
export const MAX_DIFF_CHARS_STR = process.env.MAX_DIFF_CHARS;
/** Comma-separated string of glob patterns used to filter files out of the PR diff. */
export const IGNORE_PATTERNS_STR = process.env.IGNORE_PATTERNS;
/** String representation of the temperature setting for the AI model (0-2). */
export const MODEL_TEMPERATURE_STR = process.env.MODEL_TEMPERATURE;

// --- Parsed/Derived Configuration ---

// Parse MAX_DIFF_CHARS
const DEFAULT_MAX_DIFF_CHARS = 120000;
let parsedMaxDiffChars = DEFAULT_MAX_DIFF_CHARS;
if (MAX_DIFF_CHARS_STR) {
    const parsed = parseInt(MAX_DIFF_CHARS_STR, 10);
    if (!isNaN(parsed)) {
        parsedMaxDiffChars = parsed;
    } else {
        console.warn(`Invalid MAX_DIFF_CHARS value "${MAX_DIFF_CHARS_STR}". Using default ${DEFAULT_MAX_DIFF_CHARS}.`);
    }
}
/** Maximum number of characters allowed for a PR diff before truncation. Defaults to 120000. */
export const MAX_DIFF_CHARS = parsedMaxDiffChars;

// Parse IGNORE_PATTERNS
/** An array of glob patterns used to filter files out of the PR diff, or undefined if not set. */
export const IGNORE_PATTERNS = IGNORE_PATTERNS_STR
    ? IGNORE_PATTERNS_STR.split(',').map(p => p.trim()).filter(p => p.length > 0)
    : undefined;

// Parse MODEL_TEMPERATURE
const DEFAULT_MODEL_TEMPERATURE = 0.3;
let parsedModelTemperature = DEFAULT_MODEL_TEMPERATURE;
if (MODEL_TEMPERATURE_STR) {
    const parsed = parseFloat(MODEL_TEMPERATURE_STR);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 2) { // OpenAI temperature range is 0-2
        parsedModelTemperature = parsed;
    } else {
        console.warn(`Invalid MODEL_TEMPERATURE value "${MODEL_TEMPERATURE_STR}". Must be between 0 and 2. Using default ${DEFAULT_MODEL_TEMPERATURE}.`);
    }
}
/** The temperature setting for the AI model (0-2). Defaults to 0.3. */
export const MODEL_TEMPERATURE = parsedModelTemperature;

// Parse JIRA_BRANCH_REGEX
/** A RegExp object parsed from JIRA_BRANCH_REGEX_STR, or undefined if not set. Used to extract Jira ticket IDs from branch names. */
let parsedJiraRegex: RegExp | undefined;
if (JIRA_BRANCH_REGEX_STR) {
    try {
        parsedJiraRegex = new RegExp(JIRA_BRANCH_REGEX_STR);
    } catch (error) {
        throw new Error(`Invalid JIRA_BRANCH_REGEX: "${JIRA_BRANCH_REGEX_STR}". Error: ${error instanceof Error ? error.message : String(error)}`);
    }
} else {
    parsedJiraRegex = undefined;
}
export const JIRA_BRANCH_REGEX = parsedJiraRegex;

// Parse PR_AGENT_ACTIONS
let parsedActions: string[] = [];
try {
    parsedActions = JSON.parse(PR_AGENT_ACTIONS_JSON);
    if (!Array.isArray(parsedActions) || !parsedActions.every(item => typeof item === "string")) {
        console.warn(`Invalid PR_AGENT_ACTIONS JSON format: "${PR_AGENT_ACTIONS_JSON}". Expected an array of strings. Using default [].`);
        parsedActions = [];
    }
} catch (error) {
    console.warn(`Failed to parse PR_AGENT_ACTIONS JSON: "${PR_AGENT_ACTIONS_JSON}". Error: ${error}. Using default [].`);
    parsedActions = [];
}
/** An array of strings representing the enabled PR agent actions (e.g., "summary", "review"). Parsed from PR_AGENT_ACTIONS_JSON. Defaults to []. */
export const PR_AGENT_ACTIONS = parsedActions;

// Helper to check if Jira is configured
/** Boolean flag indicating if all necessary Jira configuration variables (URL, email, token) are set. */
export const IS_JIRA_CONFIGURED = Boolean(JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN);

// --- Validate Model Configuration ---
switch (MODEL_PROVIDER) {
    case "openai":
        if (!OPENAI_API_KEY || !OPENAI_MODEL) {
            throw new Error("MODEL_PROVIDER is \"openai\", but OPENAI_API_KEY or OPENAI_MODEL is missing.");
        }
        break;
    case "azure":
        if (!AZURE_API_KEY || !AZURE_OPENAI_RESOURCE || !AZURE_OPENAI_DEPLOYMENT) {
            throw new Error("MODEL_PROVIDER is \"azure\", but AZURE_API_KEY, AZURE_OPENAI_RESOURCE, or AZURE_OPENAI_DEPLOYMENT is missing.");
        }
        break;
    case "anthropic":
        if (!ANTHROPIC_API_KEY || !ANTHROPIC_MODEL) {
            throw new Error("MODEL_PROVIDER is \"anthropic\", but ANTHROPIC_API_KEY or ANTHROPIC_MODEL is missing.");
        }
        break;
    case "google":
        if (!GOOGLE_API_KEY || !GOOGLE_MODEL) {
            throw new Error("MODEL_PROVIDER is \"google\", but GOOGLE_API_KEY or GOOGLE_MODEL is missing.");
        }
        break;
    case "openai-compatible":
        if (!OPENAI_BASE_URL || !OPENAI_API_KEY || !OPENAI_MODEL) {
            throw new Error("MODEL_PROVIDER is \"openai-compatible\", but OPENAI_BASE_URL, OPENAI_API_KEY, or OPENAI_MODEL is missing.");
        }
        break;
    default:
        throw new Error(`Unsupported MODEL_PROVIDER: "${MODEL_PROVIDER}". Must be openai, azure, anthropic, google, or openai-compatible.`);
}

console.log(`Config Loaded: Model Provider=${MODEL_PROVIDER || "None"}, Jira Configured=${IS_JIRA_CONFIGURED}`);