import { Step } from "@mastra/core";

/**
 * Factory function to create a Mastra workflow step that performs no operation.
 * Useful as a placeholder or target in conditional workflow branches.
 * @param stepId - The unique identifier for the created No-Op step.
 * @returns A Mastra Step instance with an empty execute function.
 */
export const noOpStepFactory = (stepId: string) =>
  new Step({
    id: stepId,
    execute: async () => {},
  });
