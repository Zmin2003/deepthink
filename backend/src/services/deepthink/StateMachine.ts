import { EventEmitter } from 'events';
import type { AgentState, NodeResult } from '../../models/AgentState.js';

export type NodeName = 'planner' | 'experts' | 'critic' | 'reviewer' | 'synthesizer';
export type NodeFunction = (state: AgentState) => Promise<NodeResult>;
export type ConditionalEdge = (state: AgentState) => NodeName | null;

export interface StateUpdate {
  type: 'node_start' | 'node_complete' | 'node_error' | 'complete' | 'expert_complete';
  node?: NodeName;
  state?: AgentState;
  data?: any;
  error?: Error;
}

export class StateMachine extends EventEmitter {
  private nodes: Map<NodeName, NodeFunction> = new Map();
  private edges: Map<NodeName, NodeName | ConditionalEdge> = new Map();
  private state: AgentState;

  constructor(initialState: AgentState) {
    super();
    this.state = initialState;
  }

  addNode(name: NodeName, fn: NodeFunction) {
    this.nodes.set(name, fn);
  }

  addEdge(from: NodeName, to: NodeName | ConditionalEdge) {
    this.edges.set(from, to);
  }

  async *run(startNode: NodeName): AsyncGenerator<StateUpdate> {
    let currentNode: NodeName | null = startNode;

    while (currentNode) {
      yield {
        type: 'node_start',
        node: currentNode,
        state: this.state,
      };

      const nodeFn = this.nodes.get(currentNode);
      if (!nodeFn) {
        throw new Error(`Node ${currentNode} not found`);
      }

      try {
        const result = await nodeFn(this.state);
        this.state = { ...this.state, ...result };

        yield {
          type: 'node_complete',
          node: currentNode,
          state: this.state,
          data: result,
        };

        const nextEdge = this.edges.get(currentNode);
        if (!nextEdge) {
          currentNode = null;
        } else if (typeof nextEdge === 'function') {
          currentNode = nextEdge(this.state);
        } else {
          currentNode = nextEdge;
        }
      } catch (error) {
        yield {
          type: 'node_error',
          node: currentNode ?? undefined,
          error: error as Error,
        };
        throw error;
      }
    }

    yield {
      type: 'complete',
      state: this.state,
    };
  }

  getState(): AgentState {
    return this.state;
  }
}
