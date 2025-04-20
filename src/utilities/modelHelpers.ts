import { createAnthropic } from "@ai-sdk/anthropic"
import { createAzure } from "@ai-sdk/azure"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import * as config from "../config.js";

/**
 * Creates and returns an AI model instance based on the configuration settings.
 * Reads the `MODEL_PROVIDER` from the config and initialises the corresponding
 * AI SDK client (OpenAI, Azure, Anthropic, Google, or OpenAI-compatible).
 * Requires specific API keys and model identifiers based on the chosen provider.
 * @throws {Error} If the specified provider is unsupported or required configuration is missing.
 * @returns An initialised AI model instance ready for use.
 */
export const getModel = () =>
{
    switch(config.MODEL_PROVIDER)
    {
        case "openai":
            const openai = createOpenAI({ apiKey: config.OPENAI_API_KEY });
            return openai(config.OPENAI_MODEL!);

        case "azure":
            const azure = createAzure({ apiKey: config.AZURE_API_KEY, resourceName: config.AZURE_OPENAI_RESOURCE });
            return azure(config.AZURE_OPENAI_DEPLOYMENT!);

        case "anthropic":
            const anthropic = createAnthropic({ apiKey: config.ANTHROPIC_API_KEY });
            return anthropic(config.ANTHROPIC_MODEL!);

        case "google":
            const google = createGoogleGenerativeAI({ apiKey: config.GOOGLE_API_KEY });
            return google(config.GOOGLE_MODEL!);

        case "openai-compatible": {
            const openAiCompatible = createOpenAICompatible({ name: "Custom", apiKey: config.OPENAI_API_KEY!, baseURL: config.OPENAI_BASE_URL! });
            return openAiCompatible(config.OPENAI_MODEL!);
        }

        default:
            throw new Error(`Unexpected MODEL_PROVIDER encountered in getModel: "${config.MODEL_PROVIDER}". Supported providers are openai, azure, anthropic, google, or openai-compatible.`);
    }
}