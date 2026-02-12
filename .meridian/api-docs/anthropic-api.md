# Anthropic Claude API

The Anthropic Claude API provides programmatic access to Claude language models through a Messages API.

**SDK version researched**: `@anthropic-ai/sdk` v0.74.0 (as of 2026-02-11)
**Official docs**: https://platform.claude.com/docs
**API base URL**: `https://api.anthropic.com`
**API version header**: `anthropic-version: 2023-06-01` (sent automatically by SDK)

## Overview

The Claude API centers on a single primary endpoint: `POST /v1/messages`. You send a structured list of messages (user/assistant turns) along with a model identifier, and the model generates the next assistant message. The API is stateless -- there is no server-side conversation state. Every request must include the full conversation history.

The official TypeScript SDK (`@anthropic-ai/sdk`) wraps this HTTP API with typed methods, streaming helpers, tool execution runners, and structured output parsing.

## Available Models

The SDK's `Model` type defines these model identifiers (from SDK v0.74.0 source):

| Model ID | Description |
|---|---|
| `claude-opus-4-6` | Claude Opus 4.6 -- latest and most capable. Released 2026-02-05. |
| `claude-opus-4-5` | Claude Opus 4.5 alias |
| `claude-opus-4-5-20251101` | Claude Opus 4.5 dated snapshot |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 dated snapshot |
| `claude-opus-4-0` | Claude Opus 4.0 alias |
| `claude-opus-4-20250514` | Claude Opus 4.0 dated snapshot |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 alias |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 dated snapshot |
| `claude-sonnet-4-0` | Claude Sonnet 4.0 alias |
| `claude-sonnet-4-20250514` | Claude Sonnet 4.0 dated snapshot |
| `claude-haiku-4-5` | Claude Haiku 4.5 alias |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 dated snapshot |

**Deprecated models** (will be removed):
- `claude-3-7-sonnet-latest` / `claude-3-7-sonnet-20250219` -- EOL February 19, 2026
- `claude-3-5-haiku-latest` / `claude-3-5-haiku-20241022` -- EOL February 19, 2026
- `claude-3-opus-20240229` -- EOL January 5, 2026 (already past)
- `claude-3-haiku-20240307` -- deprecated
- `claude-2.x`, `claude-1.x`, `claude-instant-1.x` -- already EOL

**Non-streaming token limits**: Opus 4.0 and 4.1 are limited to 8,192 `max_tokens` for non-streaming requests (from SDK constants). Use streaming for longer outputs.

**Adaptive thinking note**: The SDK warns against using `thinking.type = 'enabled'` with `claude-opus-4-6`. Use `thinking.type = 'adaptive'` instead, which provides better performance according to Anthropic's testing.

## Setup

### Installation

```bash
npm install @anthropic-ai/sdk
```

Requires TypeScript >= 4.9, Node.js >= 20 LTS. Also supports Deno, Bun, Cloudflare Workers, and Vercel Edge Runtime.

### Authentication

```typescript
import Anthropic from '@anthropic-ai/sdk';

// Option 1: Uses ANTHROPIC_API_KEY env var automatically
const client = new Anthropic();

// Option 2: Explicit API key
const client = new Anthropic({
  apiKey: 'sk-ant-...',
});

// Option 3: Async key function (for rotation/refresh)
const client = new Anthropic({
  apiKey: async () => {
    return await fetchKeyFromVault();
  },
});
```

### Client Options

```typescript
const client = new Anthropic({
  apiKey: string | (() => Promise<string>),  // default: process.env.ANTHROPIC_API_KEY
  authToken: string,          // default: process.env.ANTHROPIC_AUTH_TOKEN
  baseURL: string,            // default: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'
  timeout: number,            // default: 10 minutes (ms). Auto-scales up for large max_tokens
  maxRetries: number,         // default: 2
  fetch: Fetch,               // custom fetch implementation
  fetchOptions: RequestInit,  // additional fetch options (e.g., proxy config)
  dangerouslyAllowBrowser: boolean,  // default: false
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'off',  // default: 'warn'
  logger: Logger,             // default: globalThis.console
  defaultHeaders: HeadersLike,
  defaultQuery: Record<string, string>,
});
```

## Messages API

### Basic Request

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Explain quantum computing in simple terms.' }
  ],
});

console.log(message.content[0].type);  // 'text'
console.log(message.content[0].text);  // The response text
console.log(message.usage);            // { input_tokens: N, output_tokens: N }
console.log(message.stop_reason);      // 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use'
```

### MessageCreateParams (Full)

```typescript
interface MessageCreateParams {
  // Required
  model: Model;                              // e.g., 'claude-sonnet-4-5-20250929'
  max_tokens: number;                        // Maximum tokens to generate
  messages: Array<MessageParam>;             // Conversation history

  // Optional
  system?: string | Array<TextBlockParam>;   // System prompt
  temperature?: number;                      // 0.0 to 1.0, default 1.0
  top_k?: number;                            // Advanced: sample from top K
  top_p?: number;                            // Advanced: nucleus sampling
  stop_sequences?: Array<string>;            // Custom stop sequences
  stream?: boolean;                          // Enable SSE streaming
  metadata?: { user_id?: string };           // For abuse detection
  tools?: Array<ToolUnion>;                  // Tool definitions
  tool_choice?: ToolChoice;                  // How to use tools
  thinking?: ThinkingConfigParam;            // Extended thinking config
  output_config?: OutputConfig;              // Structured output / effort config
  service_tier?: 'auto' | 'standard_only';   // Priority vs standard capacity
  inference_geo?: string;                    // Geographic region for inference
}
```

### Message Response

```typescript
interface Message {
  id: string;                    // e.g., 'msg_01XFDUDYJgAACzvnptvVoYEL'
  type: 'message';
  role: 'assistant';
  model: Model;
  content: Array<ContentBlock>;  // TextBlock | ThinkingBlock | ToolUseBlock | ...
  stop_reason: StopReason | null;
  stop_sequence: string | null;
  usage: Usage;
}

interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
  cache_creation: CacheCreation | null;
  server_tool_use: ServerToolUsage | null;
  service_tier: 'standard' | 'priority' | 'batch' | null;
  inference_geo: string | null;
}

type StopReason = 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use'
               | 'pause_turn' | 'refusal';
```

### Multi-Turn Conversations

The API is stateless. Build conversation history by alternating user/assistant messages:

```typescript
const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'What is the capital of France?' },
  { role: 'assistant', content: 'The capital of France is Paris.' },
  { role: 'user', content: 'What is its population?' },
];

const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages,
});
```

Consecutive messages with the same role are merged into a single turn automatically. The first message must have `role: 'user'`. There is a limit of 100,000 messages per request.

### System Prompts

System prompts are a top-level parameter, not a message role:

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  system: 'You are a helpful coding assistant. Always provide code examples.',
  messages: [{ role: 'user', content: 'How do I read a file in Node.js?' }],
});

// System prompt with cache control
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: 'You are a helpful coding assistant with deep knowledge of TypeScript.',
      cache_control: { type: 'ephemeral' },
    }
  ],
  messages: [{ role: 'user', content: 'Help me write a parser.' }],
});
```

### Prefilling Assistant Responses

End with an assistant message to constrain the model's output:

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'What is 2+2? Answer with just the number.' },
    { role: 'assistant', content: 'The answer is ' },
  ],
});
// response.content[0].text might be "4"
```

## Streaming

### Low-Level Streaming (SSE)

Uses less memory -- does not accumulate a final message object:

```typescript
const stream = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Write a short story.' }],
  stream: true,
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

Stream events in order:
1. `message_start` -- contains the `Message` object (with empty content)
2. `content_block_start` -- start of each content block
3. `content_block_delta` -- incremental content (text, thinking, tool input JSON)
4. `content_block_stop` -- end of a content block
5. `message_delta` -- stop reason and final usage
6. `message_stop` -- stream complete

Cancel a stream with `break` or `stream.controller.abort()`.

### High-Level Streaming Helpers

The `.stream()` method provides event handlers and accumulates a final message:

```typescript
const stream = client.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Write a poem.' }],
});

// Event-based
stream
  .on('text', (text) => process.stdout.write(text))
  .on('thinking', (thinking) => console.log('[thinking]', thinking))
  .on('error', (error) => console.error(error));

// Get the final accumulated message
const finalMessage = await stream.finalMessage();
console.log(finalMessage.usage);

// Or just get the final text
const text = await stream.finalText();
```

Available stream events:
- `connect` -- when connection is established
- `streamEvent` -- every raw SSE event, plus accumulated snapshot
- `text` -- text delta and accumulated text snapshot
- `thinking` -- thinking delta and accumulated thinking snapshot
- `citation` -- citation and accumulated citations
- `inputJson` -- partial JSON for tool input
- `signature` -- thinking block signature
- `message` -- when a message is complete
- `contentBlock` -- when a content block is complete
- `finalMessage` -- the fully accumulated final message
- `error` -- on error
- `abort` -- when aborted
- `end` -- stream ended

### Frontend Streaming

Stream from backend to frontend using `ReadableStream`:

```typescript
// Backend: convert to ReadableStream
const readableStream = stream.toReadableStream();

// Frontend: reconstruct from ReadableStream
const stream = MessageStream.fromReadableStream(readableStream);
```

## Tool Use (Function Calling)

### Defining Tools

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  tools: [
    {
      name: 'get_weather',
      description: 'Get the current weather in a given location.',
      input_schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City and state, e.g., "San Francisco, CA"',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit',
          },
        },
        required: ['location'],
      },
    },
  ],
  messages: [{ role: 'user', content: 'What is the weather in London?' }],
});
```

### Tool Schema

```typescript
interface Tool {
  name: string;
  input_schema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;  // Additional JSON Schema properties
  };
  description?: string;          // Strongly recommended
  cache_control?: CacheControlEphemeral | null;
  strict?: boolean;              // When true, validates tool names and inputs against schema
  eager_input_streaming?: boolean | null;  // Stream tool inputs incrementally
  type?: 'custom' | null;
}
```

### Handling Tool Use Responses

When the model wants to use a tool, `stop_reason` is `'tool_use'` and `content` contains `ToolUseBlock`s:

```typescript
const response = await client.messages.create({ /* ... with tools ... */ });

if (response.stop_reason === 'tool_use') {
  const toolUseBlocks = response.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );

  const toolResults: Anthropic.MessageParam = {
    role: 'user',
    content: toolUseBlocks.map((toolUse) => ({
      type: 'tool_result' as const,
      tool_use_id: toolUse.id,
      content: executeToolAndGetResult(toolUse.name, toolUse.input),
    })),
  };

  // Continue the conversation with tool results
  const followUp = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    tools: [/* same tools */],
    messages: [...previousMessages, { role: 'assistant', content: response.content }, toolResults],
  });
}
```

### Tool Result Block

```typescript
interface ToolResultBlockParam {
  type: 'tool_result';
  tool_use_id: string;                    // Must match the tool_use block id
  content?: string | Array<TextBlockParam | ImageBlockParam | SearchResultBlockParam | DocumentBlockParam>;
  is_error?: boolean;                     // Set true to indicate tool execution failed
  cache_control?: CacheControlEphemeral;
}
```

### Tool Choice

Control how the model uses tools:

```typescript
// Let the model decide (default)
tool_choice: { type: 'auto' }

// Force the model to use a tool (any tool)
tool_choice: { type: 'any' }

// Force a specific tool
tool_choice: { type: 'tool', name: 'get_weather' }

// Prevent tool use entirely
tool_choice: { type: 'none' }

// Disable parallel tool use (model outputs at most one tool call)
tool_choice: { type: 'auto', disable_parallel_tool_use: true }
```

### Automatic Tool Runner (Beta)

The SDK provides `toolRunner` for automatic tool execution loops:

```typescript
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const weatherTool = betaZodTool({
  name: 'get_weather',
  description: 'Get the current weather in a given location',
  inputSchema: z.object({
    location: z.string(),
  }),
  run: async (input) => {
    return `The weather in ${input.location} is sunny and 72F`;
  },
});

const result = await client.beta.messages.toolRunner({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'What is the weather in Tokyo?' }],
  tools: [weatherTool],
});
// The runner automatically calls tools and loops until the model produces a final answer
```

To report errors from tools, throw `ToolError`:

```typescript
import { ToolError } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool';

const myTool = betaZodTool({
  name: 'my_tool',
  description: 'Does something',
  inputSchema: z.object({ query: z.string() }),
  run: async (input) => {
    if (!valid(input.query)) {
      throw new ToolError('Invalid query format');
    }
    // ToolError can also accept content blocks for rich error responses
    throw new ToolError([
      { type: 'text', text: 'Error details' },
      { type: 'image', source: { type: 'base64', data: screenshot, media_type: 'image/png' } },
    ]);
  },
});
```

### Built-in Tool Types

Beyond custom tools, the API supports these special tool types:

```typescript
type ToolUnion =
  | Tool                       // Custom tools (described above)
  | ToolBash20250124           // Computer use: bash execution
  | ToolTextEditor20250124     // Computer use: text editor (str_replace_editor)
  | ToolTextEditor20250429     // Computer use: text editor v2 (str_replace_based_edit_tool)
  | ToolTextEditor20250728     // Computer use: text editor v3
  | WebSearchTool20250305;     // Server-side web search
```

### Web Search Tool

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  tools: [
    {
      type: 'web_search_20250305',
      name: 'web_search',
      // Optional filters:
      allowed_domains: ['docs.python.org', 'stackoverflow.com'],
      // OR blocked_domains: ['reddit.com'],
      max_uses: 5,
      user_location: {
        type: 'approximate',
        city: 'San Francisco',
        region: 'California',
        country: 'US',
        timezone: 'America/Los_Angeles',
      },
    },
  ],
  messages: [{ role: 'user', content: 'What are the latest Python 3.13 features?' }],
});
```

## Structured Output (JSON Mode)

The API supports structured outputs via `output_config.format` with JSON Schema validation. The SDK provides both Zod-based and raw JSON Schema helpers.

### Using Zod (Recommended)

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

const client = new Anthropic();

// .parse() automatically validates and types the response
const message = await client.messages.parse({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'What is the capital of France? Include population.' }],
  output_config: {
    format: zodOutputFormat(z.object({
      capital: z.string(),
      country: z.string(),
      population: z.number(),
      fun_fact: z.string(),
    })),
  },
});

// Typed access to parsed output
console.log(message.parsed_output?.capital);     // "Paris"
console.log(message.parsed_output?.population);  // 2161000
```

### Using JSON Schema Directly

```typescript
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';

const message = await client.messages.parse({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'List 3 programming languages.' }],
  output_config: {
    format: jsonSchemaOutputFormat({
      type: 'object',
      properties: {
        languages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              year_created: { type: 'number' },
            },
            required: ['name', 'year_created'],
          },
        },
      },
      required: ['languages'],
    } as const),
  },
});
```

### Streaming with Structured Output

```typescript
const stream = client.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'What is 2+2?' }],
  output_config: {
    format: zodOutputFormat(z.object({ answer: z.number() })),
  },
});

const message = await stream.finalMessage();
console.log(message.parsed_output?.answer); // 4
```

### Without SDK Helpers (Raw API)

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'List 3 colors as JSON.' }],
  output_config: {
    format: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: {
          colors: { type: 'array', items: { type: 'string' } },
        },
        required: ['colors'],
      },
    },
  },
});

// Must parse manually
const data = JSON.parse(response.content[0].text);
```

### Output Effort Level

Control how much effort the model puts into its response:

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Quick: is 7 prime?' }],
  output_config: {
    effort: 'low',  // 'low' | 'medium' | 'high' | 'max'
  },
});
```

## Extended Thinking

Extended thinking lets Claude show its reasoning process before answering.

### Configuration Options

```typescript
// Adaptive thinking (recommended for claude-opus-4-6)
thinking: { type: 'adaptive' }

// Enabled with explicit budget
thinking: { type: 'enabled', budget_tokens: 10000 }

// Disabled
thinking: { type: 'disabled' }
```

### Usage

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 16000,
  thinking: {
    type: 'enabled',
    budget_tokens: 10000,  // Must be >= 1024, less than max_tokens
  },
  messages: [{ role: 'user', content: 'Solve this step by step: if x^2 + 3x - 10 = 0, find x.' }],
});

for (const block of response.content) {
  if (block.type === 'thinking') {
    console.log('Thinking:', block.thinking);
    // block.signature is a cryptographic signature for verification
  } else if (block.type === 'text') {
    console.log('Answer:', block.text);
  } else if (block.type === 'redacted_thinking') {
    // Internal reasoning that was redacted for safety
    console.log('Redacted thinking block');
  }
}
```

### Streaming Thinking

```typescript
const stream = client.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 16000,
  thinking: { type: 'enabled', budget_tokens: 8000 },
  messages: [{ role: 'user', content: 'Analyze this code for bugs...' }],
});

stream
  .on('thinking', (delta, snapshot) => {
    process.stderr.write(delta);  // Stream thinking to stderr
  })
  .on('text', (delta) => {
    process.stdout.write(delta);  // Stream answer to stdout
  });

await stream.finalMessage();
```

### Multi-Turn with Thinking

When continuing a conversation that includes thinking blocks, pass them back:

```typescript
const messages: Anthropic.MessageParam[] = [
  { role: 'user', content: 'Solve x^2 = 4' },
  {
    role: 'assistant',
    content: [
      { type: 'thinking', thinking: '...previous thinking...', signature: '...' },
      { type: 'text', text: 'x = 2 or x = -2' },
    ],
  },
  { role: 'user', content: 'Now solve x^3 = 8' },
];
```

## Prompt Caching

Prompt caching reduces costs and latency for repeated content (system prompts, large documents, tool definitions). Add `cache_control` breakpoints to content blocks:

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  system: [
    {
      type: 'text',
      text: longSystemPrompt,
      cache_control: { type: 'ephemeral', ttl: '5m' },  // TTL: '5m' (default) or '1h'
    },
  ],
  tools: [
    {
      name: 'search_docs',
      description: 'Search documentation',
      input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages: [{ role: 'user', content: 'Find info about authentication' }],
});

// Check cache usage
console.log(response.usage.cache_creation_input_tokens);  // Tokens used to create cache
console.log(response.usage.cache_read_input_tokens);      // Tokens read from cache
console.log(response.usage.cache_creation);
// { ephemeral_5m_input_tokens: N, ephemeral_1h_input_tokens: N }
```

Cache TTL options:
- `'5m'` -- 5 minute cache (default, cheaper creation cost)
- `'1h'` -- 1 hour cache (higher creation cost, but cached reads last longer)

## Message Batches

For high-throughput, non-latency-sensitive workloads. Batches are processed asynchronously at reduced cost.

```typescript
// Create a batch
const batch = await client.messages.batches.create({
  requests: [
    {
      custom_id: 'request-1',
      params: {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Summarize quantum computing.' }],
      },
    },
    {
      custom_id: 'request-2',
      params: {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Explain machine learning.' }],
      },
    },
  ],
});

console.log(batch.id);                // 'msgbatch_...'
console.log(batch.processing_status); // 'in_progress'

// Poll or check later
const status = await client.messages.batches.retrieve(batch.id);

// Get results when done
if (status.processing_status === 'ended') {
  const results = await client.messages.batches.results(batch.id);
  for await (const entry of results) {
    if (entry.result.type === 'succeeded') {
      console.log(entry.custom_id, entry.result.message.content);
    }
  }
}

// Other batch operations
await client.messages.batches.cancel(batch.id);
await client.messages.batches.delete(batch.id);

// List batches with auto-pagination
for await (const batch of client.messages.batches.list({ limit: 20 })) {
  console.log(batch.id, batch.processing_status);
}
```

## Token Counting

Count tokens before sending a request:

```typescript
const count = await client.messages.countTokens({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: 'Hello, world!' }],
  system: 'You are helpful.',
  // Can also include tools, thinking config
});

console.log(count.input_tokens);  // e.g., 15
```

## Content Types

### Multi-Modal Input (Images)

```typescript
// Base64 image
const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',  // 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
            data: base64EncodedImage,
          },
        },
        { type: 'text', text: 'What do you see in this image?' },
      ],
    },
  ],
});

// URL image
const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: 'https://example.com/photo.jpg' },
        },
        { type: 'text', text: 'Describe this.' },
      ],
    },
  ],
});
```

### PDF Documents

```typescript
const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Pdf,
          },
          // Optional:
          title: 'Research Paper',
          citations: { enabled: true },  // Enable citations from this document
          cache_control: { type: 'ephemeral' },
        },
        { type: 'text', text: 'Summarize the key findings.' },
      ],
    },
  ],
});

// URL-based PDF
{
  type: 'document',
  source: { type: 'url', url: 'https://example.com/paper.pdf' },
}

// Plain text document
{
  type: 'document',
  source: { type: 'text', media_type: 'text/plain', data: 'Document content here...' },
}
```

## Error Handling

```typescript
import Anthropic from '@anthropic-ai/sdk';

try {
  const message = await client.messages.create({ /* ... */ });
} catch (err) {
  if (err instanceof Anthropic.BadRequestError) {           // 400
    console.error('Bad request:', err.message);
  } else if (err instanceof Anthropic.AuthenticationError) { // 401
    console.error('Invalid API key');
  } else if (err instanceof Anthropic.PermissionDeniedError) { // 403
    console.error('Permission denied');
  } else if (err instanceof Anthropic.NotFoundError) {       // 404
    console.error('Not found');
  } else if (err instanceof Anthropic.UnprocessableEntityError) { // 422
    console.error('Validation error');
  } else if (err instanceof Anthropic.RateLimitError) {      // 429
    console.error('Rate limited');
  } else if (err instanceof Anthropic.InternalServerError) { // 5xx
    console.error('Server error');
  } else if (err instanceof Anthropic.APIConnectionError) {  // Network
    console.error('Connection failed');
  }

  // All API errors have:
  if (err instanceof Anthropic.APIError) {
    console.error(err.status);   // HTTP status code
    console.error(err.headers);  // Response headers
    console.error(err.name);     // Error type name
  }
}
```

### Request IDs

Every response includes a request ID for debugging:

```typescript
const message = await client.messages.create({ /* ... */ });
console.log(message._request_id);  // 'req_018EeWyXxfu5pfWkrYcMdjWG'
```

### Retries

The SDK automatically retries on transient errors (connection errors, 408, 409, 429, 5xx):

```typescript
// Global retry config
const client = new Anthropic({ maxRetries: 0 });  // Disable retries

// Per-request override
await client.messages.create({ /* ... */ }, { maxRetries: 5 });
```

### Timeouts

Default timeout is 10 minutes, auto-scaled for large `max_tokens`:

```typescript
// Global
const client = new Anthropic({ timeout: 30_000 });  // 30 seconds

// Per-request
await client.messages.create({ /* ... */ }, { timeout: 60_000 });
```

## Service Tiers

The API supports different capacity tiers:

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  service_tier: 'auto',           // Try priority first, fall back to standard
  // service_tier: 'standard_only', // Only use standard capacity
  messages: [{ role: 'user', content: 'Hello' }],
});

console.log(response.usage.service_tier);  // 'standard' | 'priority' | 'batch'
```

## Models API

List and retrieve available models:

```typescript
// List all models
for await (const model of client.models.list()) {
  console.log(model.id, model.display_name);
}

// Get specific model info
const info = await client.models.retrieve('claude-sonnet-4-5-20250929');
```

## Beta Features

Beta features are accessed through `client.beta.messages` with beta headers:

```typescript
// Code execution (beta)
const response = await client.beta.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Calculate 4242424242 * 4242424242' }],
  tools: [{ name: 'code_execution', type: 'code_execution_20250522' }],
  betas: ['code-execution-2025-05-22'],
});

// Files API (beta)
await client.beta.files.upload({
  file: new File(['content'], 'data.json', { type: 'application/json' }),
  betas: ['files-api-2025-04-14'],
});
```

## Best Practices

**Use streaming for long outputs.** Non-streaming requests to Opus models are capped at 8,192 tokens. Networks may drop idle connections on long-running requests. Streaming gives incremental feedback and avoids timeouts.

**Provide detailed tool descriptions.** The `description` field in tool definitions significantly impacts how well the model uses tools. Include what the tool does, when to use it, what inputs mean, and expected output format.

**Use adaptive thinking for Opus 4.6.** The SDK explicitly warns against `thinking.type = 'enabled'` with `claude-opus-4-6`. Use `thinking.type = 'adaptive'` instead for better performance.

**Cache large, repeated content.** System prompts, tool definitions, and large documents benefit from prompt caching. Place `cache_control` breakpoints on content that stays constant across requests.

**Set temperature appropriately.** Use lower temperature (near 0.0) for analytical and deterministic tasks; higher (near 1.0) for creative tasks. Even `temperature: 0.0` is not fully deterministic.

**Use structured outputs for reliable JSON.** The `output_config.format` with JSON Schema ensures the model returns valid JSON matching your schema, rather than hoping a prompt-based approach works.

**Use batches for bulk processing.** The Message Batches API processes requests asynchronously at lower cost, appropriate for non-latency-sensitive workloads like bulk classification or summarization.

**Handle rate limits with retries.** The SDK auto-retries on 429 errors (2 retries by default). For high-throughput applications, implement your own backoff or use the batch API.

## Common Mistakes

**Omitting `max_tokens`.** It is required on every request. The model will stop generating at this limit.

**Using a `system` role in messages.** There is no `system` role. System prompts are a separate top-level parameter.

**Not returning thinking blocks in multi-turn.** When continuing a conversation that used extended thinking, you must include the `thinking` and `redacted_thinking` blocks in the assistant message. Omitting them breaks the conversation context.

**Setting `budget_tokens` too low.** Extended thinking requires `budget_tokens >= 1024` and it must be less than `max_tokens`.

**Using `thinking.type = 'enabled'` with Opus 4.6.** Use `'adaptive'` instead, per the SDK's deprecation warning.

**Requesting large non-streaming responses from Opus models.** Opus 4.0/4.1 have a hard limit of 8,192 `max_tokens` for non-streaming. The SDK will throw an error for estimated long non-streaming requests.

## Rate Limits and Constraints

**Message limits**: Up to 100,000 messages per request.

**Retries**: SDK retries 2 times by default on transient errors (429, 5xx, connection errors).

**Timeout**: 10 minutes default, auto-scaled up to 60 minutes for large `max_tokens` on non-streaming.

**Non-streaming Opus limit**: 8,192 `max_tokens` for `claude-opus-4-0` and `claude-opus-4-1` (from SDK constants). Use streaming for longer outputs.

**Rate limits** are applied per-organization and vary by tier. Check response headers for current limits:
- `x-ratelimit-limit-requests`
- `x-ratelimit-limit-tokens`
- `x-ratelimit-remaining-requests`
- `x-ratelimit-remaining-tokens`

Consult https://platform.claude.com/docs/en/api/rate-limits for current tier-specific limits.

## Raw HTTP API Reference

For direct HTTP usage without the SDK:

```
POST https://api.anthropic.com/v1/messages
POST https://api.anthropic.com/v1/messages/count_tokens
POST https://api.anthropic.com/v1/messages/batches
GET  https://api.anthropic.com/v1/messages/batches/{id}
GET  https://api.anthropic.com/v1/messages/batches
DELETE https://api.anthropic.com/v1/messages/batches/{id}
POST https://api.anthropic.com/v1/messages/batches/{id}/cancel
GET  https://api.anthropic.com/v1/messages/batches/{id}/results
GET  https://api.anthropic.com/v1/models
GET  https://api.anthropic.com/v1/models/{model_id}
```

Required headers:
- `x-api-key: YOUR_API_KEY`
- `anthropic-version: 2023-06-01`
- `content-type: application/json`

## Links

- **Official docs**: https://platform.claude.com/docs
- **TypeScript SDK**: https://github.com/anthropics/anthropic-sdk-typescript
- **npm package**: https://www.npmjs.com/package/@anthropic-ai/sdk
- **API reference**: https://platform.claude.com/docs/en/api/typescript/messages/create
- **Tool use guide**: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- **Extended thinking**: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking
- **Structured outputs**: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- **Rate limits**: https://platform.claude.com/docs/en/api/rate-limits
- **Model deprecations**: https://docs.anthropic.com/en/docs/resources/model-deprecations
