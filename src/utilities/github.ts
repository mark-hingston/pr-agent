import * as github from "@actions/github";
import { z } from "zod";
import micromatch from "micromatch";
import * as config from "../config.js";

/**
 * Zod schema defining the structure for essential pull request details.
 */
export const PrDetailsSchema = z.object({
  branchName: z.string(),
  prTitle: z.string(),
  prDescription: z.string(),
  commitMessages: z.string(),
});
/**
 * TypeScript type inferred from PrDetailsSchema, representing essential PR details.
 */
export type PrDetails = z.infer<typeof PrDetailsSchema>;

/**
 * Creates and returns an authenticated Octokit client instance.
 * Requires the GITHUB_TOKEN to be set in the configuration.
 * @throws {Error} If GITHUB_TOKEN is not set.
 * @returns An authenticated Octokit instance.
 */
const getOctokitClient = () => {
    if (!config.GITHUB_TOKEN) {
        throw new Error("GITHUB_TOKEN environment variable is not set.");
    }
    return github.getOctokit(config.GITHUB_TOKEN);
};

/**
 * Retrieves the pull request number from the GitHub Actions context.
 * @throws {Error} If the PR number cannot be determined from the context.
 * @returns The pull request number.
 */
const getPullRequestNumber = (): number => {
    const prNumber = github.context.payload.pull_request?.number;
    if (!prNumber) {
        throw new Error("Could not get PR number from context.");
    }
    return prNumber;
};

/**
 * Fetches the full pull request data object from the GitHub API.
 * @throws {Error} If fetching the PR data fails.
 * @returns A Promise resolving to the pull request data object.
 */
export const getPullRequestData = async () => {
    const octokit = getOctokitClient();
    const prNumber = getPullRequestNumber();

    try {
        const { data: pullRequest } = await octokit.rest.pulls.get({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber,
        });
        return pullRequest;
    } catch (error) {
        console.error(`Error fetching PR data for PR #${prNumber}:`, error);
        throw error;
    }
};

/**
 * Fetches essential details (branch name, title, description, commit messages)
 * for the current pull request.
 * @throws {Error} If fetching PR details or commit messages fails.
 * @returns A Promise resolving to an object containing PR details.
 */
export const getPrDetails = async (): Promise<PrDetails> => {
  try {
    const pullRequest = await getPullRequestData();
    return {
      branchName: pullRequest.head.ref,
      prTitle: pullRequest.title,
      prDescription: pullRequest.body || "",
      commitMessages: await getPrCommitMessages(),
    };
  } catch (error) {
    console.error("Error getting PR details:", error);
    throw error;
  }
};

/**
 * Fetches the diff content for the current pull request from the GitHub API.
 * Optionally filters the diff content, excluding sections related to files
 * matching the provided ignore patterns.
 * @param ignorePatterns - An optional array of glob patterns to filter ignored files.
 * @throws {Error} If fetching the PR diff fails.
 * @returns A Promise resolving to the (potentially filtered) diff string.
 */
export const getPrDiff = async (ignorePatterns?: string[]): Promise<string> => {
    const octokit = getOctokitClient();
    const prNumber = getPullRequestNumber();

    try {
        const { data: diff } = await octokit.rest.pulls.get({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber,
            mediaType: {
                format: "diff",
            },
        });

        const rawDiff = diff as unknown as string;

        if (!ignorePatterns || ignorePatterns.length === 0) {
            console.log("No ignore patterns provided, returning raw diff.");
            return rawDiff;
        }

        console.log("Filtering diff with patterns:", ignorePatterns);
        const diffLines = rawDiff.split("\n");
        const filteredLines: string[] = [];
        let currentFilePath: string | null = null;
        let isIgnored = false;

        for (const line of diffLines) {
            if (line.startsWith("diff --git a/")) {
                // Extract the file path from the diff header
                const match = line.match(/^diff --git a\/(.*?) b\/(.*?)$/);
                currentFilePath = match ? match[2] : null;

                if (currentFilePath) {
                    // Check if the current file path matches any ignore patterns
                    // Use { dot: true } to ensure patterns like ".*" match dotfiles
                    isIgnored = micromatch.isMatch(currentFilePath, ignorePatterns, { dot: true });
                    if (isIgnored) {
                        console.log(`Ignoring file section: ${currentFilePath}`);
                    } else {
                         console.log(`Including file section: ${currentFilePath}`);
                    }
                } else {
                    // Handle cases where the file path couldn't be parsed (should be rare)
                    console.warn(`Could not parse file path from diff line: ${line}`);
                    isIgnored = false;
                }
            }

            // Add the line to the filtered output if the current file section is not ignored
            if (!isIgnored) {
                filteredLines.push(line);
            }
        }

        const filteredDiff = filteredLines.join("\n");
        console.log(`Original diff length: ${rawDiff.length}, Filtered diff length: ${filteredDiff.length}`);
        return filteredDiff;

    } catch (error) {
        console.error(`Error fetching PR diff for PR #${prNumber}:`, error);
        throw error;
    }
};

/**
 * Posts a comment to the current pull request.
 * @param commentBody - The Markdown content of the comment.
 * @throws {Error} If posting the comment fails.
 * @returns A Promise resolving when the comment is posted.
 */
export const postPrComment = async (commentBody: string): Promise<void> => {
    const octokit = getOctokitClient();
    const prNumber = getPullRequestNumber();

    try {
        await octokit.rest.issues.createComment({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: prNumber,
            body: commentBody,
        });
        console.log(`Successfully posted comment to PR #${prNumber}.`);
    } catch (error) {
        console.error(`Error posting comment to PR #${prNumber}:`, error);
        throw error;
    }
};

/**
 * Updates the description (body) of the current pull request.
 * @param newBody - The new Markdown content for the PR description.
 * @throws {Error} If updating the description fails.
 * @returns A Promise resolving when the description is updated.
 */
export const updatePrDescription = async (newBody: string): Promise<void> => {
    const octokit = getOctokitClient();
    const prNumber = getPullRequestNumber();

    try {
        await octokit.rest.pulls.update({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber,
            body: newBody,
        });
        console.log(`Successfully updated description for PR #${prNumber}.`);
    } catch (error) {
        console.error(`Error updating description for PR #${prNumber}:`, error);
        throw error;
    }
};

/**
 * Fetches all comments for the current pull request (issue).
 * @throws {Error} If fetching comments fails.
 * @returns A Promise resolving to an array of comment objects from the GitHub API.
 */
export const getIssueComments = async () => {
    try {
        const octokit = getOctokitClient();
        const issueNumber = getPullRequestNumber();
        console.log(`Fetching comments for issue #${issueNumber}`);

        // Fetch comments using pagination implicitly handled by Octokit or explicitly if needed
        const { data: comments } = await octokit.rest.issues.listComments({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            issue_number: issueNumber,
        });
        console.log(`Found ${comments.length} comments.`);
        return comments;
    } catch(error) {
        console.error("Error fetching issue comments:", error);
        throw error;
    }
};

/**
 * Edits an existing comment on the current pull request (issue).
 * @param commentId - The ID of the comment to edit.
 * @param newBody - The new Markdown content for the comment.
 * @throws {Error} If editing the comment fails.
 * @returns A Promise resolving when the comment is edited.
 */
export const editIssueComment = async (commentId: number, newBody: string): Promise<void> => {
    try {
        const octokit = getOctokitClient();
        console.log(`Editing comment ID: ${commentId}`);

        await octokit.rest.issues.updateComment({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            comment_id: commentId,
            body: newBody,
        });
        console.log(`Comment ${commentId} updated successfully.`);
    } catch (error) {
        console.error(`Error editing comment ${commentId}:`, error);
        throw error;
    }
};

/**
 * Fetches the commit messages for the current pull request.
 * @throws {Error} If fetching commit messages fails.
 * @returns A Promise resolving to a string containing formatted commit messages (or a placeholder if none found).
 */
export const getPrCommitMessages = async (): Promise<string> => {
    const octokit = getOctokitClient();
    const prNumber = getPullRequestNumber();
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;

    try {
        console.log(`Fetching commit messages for PR #${prNumber}`);
        const { data: commits } = await octokit.rest.pulls.listCommits({
            owner,
            repo,
            pull_number: prNumber,
            per_page: 100,
        });

        if (!commits || commits.length === 0) {
            console.log(`No commits found for PR #${prNumber}.`);
            return "No commit messages found.";
        }

        console.log(`Found ${commits.length} commits.`);
        // Format commit messages: take only the first line of each message
        const messages = commits
            .map(commitData => `- ${commitData.commit.message.split("\n")[0]}`)
            .join("\n");

        // Truncate if the combined messages exceed a reasonable length
        const maxLength = 2000; // Define a max length for the commit messages string
        if (messages.length > maxLength) {
             console.log(`Commit messages length (${messages.length}) exceeds max length (${maxLength}), truncating.`);
             return messages.substring(0, maxLength) + "\n... (truncated)";
        }

        return messages;

    } catch (error) {
        console.error(`Error fetching commit messages for PR #${prNumber}:`, error);
        throw error;
    }
};