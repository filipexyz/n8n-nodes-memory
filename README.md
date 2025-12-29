# n8n-nodes-memory

Custom memory node for n8n AI Agent with external API support.

## The Power: Memory as Workflows

Traditional memory nodes are passive storage. This node transforms memory into **event-driven workflows** - each memory operation (get, add, clear) can trigger complete n8n workflows with access to 400+ integrations.

### On GET (before AI responds)
- Fetch context from vector databases (RAG)
- Load user preferences from CRM
- Inject real-time data (weather, stocks, news)
- Summarize old conversations automatically
- Generate dynamic context with another AI
- Apply predictive loading for likely questions

### On ADD (after each message)
- Analyze sentiment in real-time
- Extract entities and intents
- Update user profiles and CRM records
- Create tasks/tickets automatically
- Trigger notifications and alerts
- Route to different AI agents based on intent
- Build knowledge graphs from conversations
- Feed training data pipelines

### On CLEAR (end of session)
- Generate conversation summaries
- Extract action items
- Send follow-up emails
- Archive to compliance systems
- Update customer journey stages

## Use Cases

**Self-Evolving AI** - Behavior rules that adapt based on conversation patterns. Detect frustration, switch to empathetic mode.

**Multi-Agent Orchestration** - Route messages to specialized agents. One memory feeding an agent swarm.

**Memory as API Gateway** - Natural language interface to any system. "Check my order status" triggers lookup workflows.

**Semantic Compression** - Compress long exchanges into dense summaries, expand on retrieval. Effectively infinite context window.

**Cross-Platform Identity** - Sync across WhatsApp, Telegram, Web. Same AI remembers you everywhere.

**Conversation Branching** - Create save points, fork conversations, explore different paths. Git for chat.

**Regulatory Firewall** - Check compliance before storing, redact sensitive info based on user role. GDPR/LGPD by design.

**Continuous Learning** - Route high-quality exchanges to training datasets. Self-improving system.

**Social Graph Memory** - Map relationships mentioned in conversations. Build knowledge graphs of user's world.

**Emotional State Machine** - Track emotional journey, maintain consistent AI "mood" across sessions.

## Installation

```bash
npm install n8n-nodes-memory
```

Then restart n8n.

## Setup

1. **Create a Memory API workflow** - A webhook that handles `get`, `add`, and `clear` actions
2. **Set up your storage** - PostgreSQL, Redis, or any backend
3. **Connect to AI Agent** - Link the Memory API node to your agent's memory input

## API Contract

Your webhook must handle POST requests with:

| Action | Purpose | Returns |
|--------|---------|---------|
| `get` | Retrieve messages for session | `{ messages: [{ type, content }, ...] }` |
| `add` | Store a message | `{ success: true }` |
| `clear` | Clear session history | `{ success: true }` |

Message types: `human` or `ai`

## Parameters

| Parameter | Description |
|-----------|-------------|
| API URL | Your memory webhook URL |
| Session ID | Unique conversation identifier |
| API Key | Optional Bearer token |
| Context Window Length | Messages to include (default: 10) |

## How It Works

Implements LangChain's `BaseListChatMessageHistory` with `BufferWindowMemory`. The AI Agent calls your workflows automatically during conversation.

## License

MIT

## Author

[Filipe Labs](https://github.com/filipexyz)
