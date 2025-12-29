import type {
  INodeType,
  INodeTypeDescription,
  ISupplyDataFunctions,
  SupplyData,
  IExecuteWorkflowInfo,
  INodeExecutionData,
  IDataObject,
} from 'n8n-workflow';
import { BufferWindowMemory } from 'langchain/memory';
import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';

type WorkflowExecutor = (data: Record<string, unknown>) => Promise<Record<string, unknown>>;

class WorkflowChatHistory extends BaseListChatMessageHistory {
  lc_namespace = ['langchain', 'stores', 'message', 'workflow'];

  constructor(
    private executeWorkflow: WorkflowExecutor,
    private sessionId: string,
  ) {
    super();
  }

  async getMessages(): Promise<BaseMessage[]> {
    console.log('[WorkflowChatHistory] getMessages called for session:', this.sessionId);
    try {
      const result = await this.executeWorkflow({
        action: 'get',
        sessionId: this.sessionId,
      });

      const messages = (result?.messages as Array<{ type: string; content: string }>) ?? [];
      console.log('[WorkflowChatHistory] Got messages:', messages.length);

      return messages.map((m) => {
        if (m.type === 'human') {
          return new HumanMessage(m.content);
        } else {
          return new AIMessage(m.content);
        }
      });
    } catch (error) {
      console.error('[WorkflowChatHistory] getMessages error:', error);
      return [];
    }
  }

  async addMessage(message: BaseMessage): Promise<void> {
    console.log('[WorkflowChatHistory] addMessage called for session:', this.sessionId);
    try {
      const type = message._getType() === 'human' ? 'human' : 'ai';

      await this.executeWorkflow({
        action: 'add',
        sessionId: this.sessionId,
        message: {
          type,
          content: message.content,
        },
      });
      console.log('[WorkflowChatHistory] Message added successfully');
    } catch (error) {
      console.error('[WorkflowChatHistory] addMessage error:', error);
    }
  }

  async addMessages(messages: BaseMessage[]): Promise<void> {
    for (const message of messages) {
      await this.addMessage(message);
    }
  }

  async clear(): Promise<void> {
    console.log('[WorkflowChatHistory] clear called for session:', this.sessionId);
    try {
      await this.executeWorkflow({
        action: 'clear',
        sessionId: this.sessionId,
      });
    } catch (error) {
      console.error('[WorkflowChatHistory] clear error:', error);
    }
  }
}

export class MemoryWorkflow implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Memory Workflow',
    name: 'memoryWorkflow',
    icon: 'fa:project-diagram',
    group: ['transform'],
    version: 1,
    subtitle: 'Sub-Workflow Memory',
    description: 'Use a sub-workflow as chat memory storage',
    defaults: {
      name: 'Memory Workflow',
    },
    codex: {
      categories: ['AI'],
      subcategories: {
        AI: ['Memory'],
      },
      resources: {
        primaryDocumentation: [
          {
            url: 'https://github.com/filipexyz/n8n-nodes-memory',
          },
        ],
      },
    },
    inputs: [],
    outputs: ['ai_memory' as const],
    outputNames: ['Memory'],
    properties: [
      {
        displayName: 'Workflow',
        name: 'workflowId',
        type: 'workflowSelector',
        default: '',
        required: true,
        description: 'The workflow to execute for memory operations',
      },
      {
        displayName: 'Session ID',
        name: 'sessionId',
        type: 'string',
        default: '={{ $json.sessionId }}',
        required: true,
        description: 'Unique identifier for the conversation session',
      },
      {
        displayName: 'Context Window Length',
        name: 'contextWindowLength',
        type: 'number',
        default: 10,
        description: 'Number of previous messages to include as context',
      },
    ],
  };

  async supplyData(
    this: ISupplyDataFunctions,
    itemIndex: number
  ): Promise<SupplyData> {
    const workflowIdParam = this.getNodeParameter('workflowId', itemIndex) as string | { value: string };
    const workflowId = typeof workflowIdParam === 'string' ? workflowIdParam : workflowIdParam.value;
    const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
    const contextWindowLength = this.getNodeParameter('contextWindowLength', itemIndex, 10) as number;

    console.log('[Memory Workflow] Creating memory for session:', sessionId);

    const nodeContext = this;

    const executeWorkflow: WorkflowExecutor = async (data) => {
      const workflowInfo: IExecuteWorkflowInfo = {
        id: workflowId,
      };

      const items: INodeExecutionData[] = [{ json: data as IDataObject }];
      const result = await nodeContext.executeWorkflow(workflowInfo, items);

      // Get the output from the last node
      const lastNodeData = result.data?.[0]?.[0]?.json;
      return lastNodeData as Record<string, unknown> ?? {};
    };

    const chatHistory = new WorkflowChatHistory(executeWorkflow, sessionId);

    const memory = new BufferWindowMemory({
      memoryKey: 'chat_history',
      chatHistory,
      returnMessages: true,
      inputKey: 'input',
      outputKey: 'output',
      k: contextWindowLength,
    });

    return {
      response: memory,
    };
  }
}
