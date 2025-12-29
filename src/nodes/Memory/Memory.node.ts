import type {
  INodeType,
  INodeTypeDescription,
  ISupplyDataFunctions,
  SupplyData,
} from 'n8n-workflow';
import { BufferWindowMemory } from 'langchain/memory';
import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
} from '@langchain/core/messages';

class ApiChatHistory extends BaseListChatMessageHistory {
  lc_namespace = ['langchain', 'stores', 'message', 'api'];

  constructor(
    private apiUrl: string,
    private sessionId: string,
    private apiKey?: string,
  ) {
    super();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async getMessages(): Promise<BaseMessage[]> {
    console.log('[ApiChatHistory] getMessages called for session:', this.sessionId);
    try {
      console.log('[ApiChatHistory] Fetching from:', this.apiUrl);
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          action: 'get',
          sessionId: this.sessionId,
        }),
      });

      if (!response.ok) {
        console.error(`[ApiChatHistory] API error: ${response.status}`);
        return [];
      }

      const data = await response.json() as { messages?: Array<{ type: string; content: string }> };
      const messages = data?.messages ?? [];
      console.log('[ApiChatHistory] Got messages:', messages.length);

      return messages.map((m: { type: string; content: string }) => {
        if (m.type === 'human') {
          return new HumanMessage(m.content);
        } else {
          return new AIMessage(m.content);
        }
      });
    } catch (error) {
      console.error('[ApiChatHistory] getMessages error:', error);
      return [];
    }
  }

  async addMessage(message: BaseMessage): Promise<void> {
    console.log('[ApiChatHistory] addMessage called for session:', this.sessionId);
    try {
      const type = message._getType() === 'human' ? 'human' : 'ai';

      await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          action: 'add',
          sessionId: this.sessionId,
          message: {
            type,
            content: message.content,
          },
        }),
      });
      console.log('[ApiChatHistory] Message added successfully');
    } catch (error) {
      console.error('[ApiChatHistory] addMessage error:', error);
    }
  }

  async addMessages(messages: BaseMessage[]): Promise<void> {
    for (const message of messages) {
      await this.addMessage(message);
    }
  }

  async clear(): Promise<void> {
    console.log('[ApiChatHistory] clear called for session:', this.sessionId);
    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          action: 'clear',
          sessionId: this.sessionId,
        }),
      });
    } catch (error) {
      console.error('[ApiChatHistory] clear error:', error);
    }
  }
}

export class Memory implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Memory API',
    name: 'memoryApi',
    icon: 'fa:brain',
    group: ['transform'],
    version: 1,
    subtitle: 'External API Memory',
    description: 'Use an external API as chat memory storage',
    defaults: {
      name: 'Memory API',
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
        displayName: 'API URL',
        name: 'apiUrl',
        type: 'string',
        default: '',
        required: true,
        description: 'URL of the memory API (e.g., n8n webhook URL)',
        placeholder: 'https://your-n8n.com/webhook/memory',
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
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        typeOptions: {
          password: true,
        },
        default: '',
        description: 'Optional API key for authentication',
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
    const apiUrl = this.getNodeParameter('apiUrl', itemIndex) as string;
    const sessionId = this.getNodeParameter('sessionId', itemIndex) as string;
    const apiKey = (this.getNodeParameter('apiKey', itemIndex, '') as string) || undefined;
    const contextWindowLength = this.getNodeParameter('contextWindowLength', itemIndex, 10) as number;

    console.log('[Memory API] Creating memory for session:', sessionId);

    const chatHistory = new ApiChatHistory(apiUrl, sessionId, apiKey);

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
