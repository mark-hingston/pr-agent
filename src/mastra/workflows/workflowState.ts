import { PrSummary } from "../agents/prSummaryAgent.js";
import { JiraTicketInfo } from "../../utilities/jira.js";
import { PrDetails } from "../../utilities/github.js";
import { PrReview } from "../agents/prReviewerAgent.js";

/** Defines the structure for data stored within the workflow state. */
interface WorkflowStateData {
  /** Details of the pull request (title, description, branch, etc.). */
  prDetails?: PrDetails;
  /** Information fetched from a linked Jira ticket. */
  jiraTicketInfo?: JiraTicketInfo;
  /** The filtered diff content of the pull request. */
  prDiff?: string;
  /** The generated summary object for the pull request. */
  prSummary?: PrSummary;
  /** The generated review object for the pull request. */
  prReview?: PrReview;
}

/**
 * Singleton class to manage shared state across workflow steps.
 * This allows steps to pass data to subsequent steps without relying solely on context.
 */
class WorkflowState {
  private static instance: WorkflowState;
  private data: WorkflowStateData = {};

  private constructor() {} // Prevents direct instantiation

  /** Gets the singleton instance of the WorkflowState. */
  public static getInstance(): WorkflowState {
    if (!WorkflowState.instance) {
      WorkflowState.instance = new WorkflowState();
    }
    return WorkflowState.instance;
  }

  /** Sets a value in the workflow state. */
  public set<K extends keyof WorkflowStateData>(key: K, value: WorkflowStateData[K]): void {
    this.data[key] = value;
  }

  /** Gets a value from the workflow state. */
  public get<K extends keyof WorkflowStateData>(key: K): WorkflowStateData[K] | undefined {
    return this.data[key];
  }

  /** Gets a copy of all data currently in the workflow state. */
  public getAll(): WorkflowStateData {
    return { ...this.data }; // Return a copy
  }

  /** Resets the workflow state, clearing all stored data. */
  public reset(): void {
    this.data = {};
  }
}

/** The singleton instance of the workflow state manager. */
export const workflowState = WorkflowState.getInstance();