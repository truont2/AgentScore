export interface Fix {
    strategy?: string;
    explanation: string;
    code?: string;
    taskComplexity?: {
        level: string;
        reasons: string[];
    };
    costComparison?: {
        current: string;
        recommended: string;
        savingsPercent: number;
    };
}

export interface Finding {
    id: string;
    description: string;
    details: string;
    savings: string;
    confidence?: number;
    currentModel?: string;
    recommendedModel?: string;
    taskType?: string;
    currentTokens?: number;
    optimizedTokens?: number;
    callIds?: string[];
    fix?: Fix;
    // New fields for schema completeness
    promptSnippet?: string;
    prompts?: Record<string, string>;
    unnecessaryContent?: string;
}

export interface Workflow {
    id: string;
    name: string;
    timestamp: string;
    callCount: number;
    totalCost: number;
    optimizedCost: number;
    efficiencyScore: number | null;
    redundancyScore: number | null;
    modelFitScore: number | null;
    contextEfficiencyScore: number | null;
    status: 'pending' | 'analyzed';
    redundancyFindings: Finding[];
    modelOverkillFindings: Finding[];
    contextBloatFindings: Finding[];
}

export const workflows: Workflow[] = [
    {
        id: '1',
        name: 'Document Processing Agent',
        timestamp: '2026-01-08T10:23:00Z',
        callCount: 87,
        totalCost: 3.40,
        optimizedCost: 1.02,
        efficiencyScore: 34,
        redundancyScore: 45,
        modelFitScore: 62,
        contextEfficiencyScore: 28,
        status: 'analyzed',
        redundancyFindings: [
            {
                id: 'r1',
                description: 'Duplicate document parsing calls',
                details: 'Calls #12 and #47 perform identical document structure analysis on the same PDF sections.',
                savings: '$0.04/run',
                confidence: 95,
                callIds: ['Call #12', 'Call #47'],
                fix: {
                    strategy: 'Cache',
                    explanation: 'Cache the parsing result from Call #12 and reuse it in Call #47 to avoid duplicate API calls.',
                    code: `# Cache results for repeated parsing
parse_cache = {}

def cached_parse(doc_section):
    cache_key = hash(doc_section)
    if cache_key not in parse_cache:
        parse_cache[cache_key] = llm.parse(doc_section)
    return parse_cache[cache_key]`,
                },
            },
            {
                id: 'r2',
                description: 'Repeated metadata extraction',
                details: 'Calls #23, #24, and #56 all extract the same document metadata fields.',
                savings: '$0.03/run',
                confidence: 92,
                callIds: ['Call #23', 'Call #24', 'Call #56'],
                fix: {
                    strategy: 'Batch',
                    explanation: 'Combine all three metadata extraction calls into a single call that returns all fields at once.',
                    code: `# Before: Multiple calls for same document
title = llm.extract("Extract title from: {doc}")
author = llm.extract("Extract author from: {doc}")
date = llm.extract("Extract date from: {doc}")

# After: Single call, multiple fields
result = llm.extract("""
Extract from this document:
- title
- author  
- date
Return as JSON.
Document: {doc}
""")`,
                },
            },
            {
                id: 'r3',
                description: 'Redundant summarization requests',
                details: 'Call #31 and #67 generate nearly identical summaries of the same content section.',
                savings: '$0.06/run',
                confidence: 88,
                callIds: ['Call #31', 'Call #67'],
                fix: {
                    strategy: 'Share State',
                    explanation: 'Store the summary result from Call #31 in shared agent state. The agent making Call #67 can access it instead.',
                    code: `# Shared state between agents
shared_state = {}

# Agent A (Call #31)
summary = llm.summarize(content)
shared_state["section_summary"] = summary

# Agent B (Call #67) - reuse instead of regenerate
summary = shared_state.get("section_summary")`,
                },
            },
            {
                id: 'r4',
                description: 'Duplicate entity extraction',
                details: 'Named entity recognition runs twice on the same text block in calls #15 and #42.',
                savings: '$0.02/run',
                confidence: 97,
                callIds: ['Call #15', 'Call #42'],
                fix: {
                    strategy: 'Cache',
                    explanation: 'Cache NER results keyed by content hash to avoid reprocessing identical text blocks.',
                    code: `import hashlib

ner_cache = {}

def cached_ner(text):
    text_hash = hashlib.md5(text.encode()).hexdigest()
    if text_hash not in ner_cache:
        ner_cache[text_hash] = llm.extract_entities(text)
    return ner_cache[text_hash]`,
                },
            },
        ],
        modelOverkillFindings: [
            {
                id: 'm1',
                description: 'GPT-4 used for simple format conversion',
                details: 'Converting date formats and standardizing text case doesn\'t require advanced reasoning.',
                savings: '$0.08/run',
                currentModel: 'GPT-4',
                recommendedModel: 'GPT-3.5 Turbo',
                taskType: 'Format conversion',
                fix: {
                    explanation: 'This format conversion task doesn\'t need GPT-4\'s reasoning capabilities. A simpler model performs identically.',
                    code: `# Before
model = "gpt-4"

# After  
model = "gpt-3.5-turbo"  # Same quality for this task`,
                    taskComplexity: {
                        level: 'Simple',
                        reasons: ['No complex reasoning needed', 'Deterministic transformation', 'Pattern-based conversion'],
                    },
                    costComparison: {
                        current: '$0.030/1K tokens',
                        recommended: '$0.0005/1K tokens',
                        savingsPercent: 98,
                    },
                },
            },
            {
                id: 'm2',
                description: 'Claude 3 Opus for basic translation',
                details: 'Simple language translation between common language pairs can use a lighter model.',
                savings: '$0.12/run',
                currentModel: 'Claude 3 Opus',
                recommendedModel: 'Gemini Flash',
                taskType: 'Translation',
                fix: {
                    explanation: 'Common language pair translation is well-handled by faster, cheaper models with equivalent quality.',
                    code: `# Before
model = "claude-3-opus"

# After
model = "gemini-1.5-flash"  # 20x cheaper, same translation quality`,
                    taskComplexity: {
                        level: 'Simple',
                        reasons: ['Common language pair', 'No nuanced context needed', 'Standard vocabulary'],
                    },
                    costComparison: {
                        current: '$0.015/1K tokens',
                        recommended: '$0.00075/1K tokens',
                        savingsPercent: 95,
                    },
                },
            },
            {
                id: 'm3',
                description: 'GPT-4 for JSON validation',
                details: 'Schema validation and JSON formatting are deterministic tasks better suited for cheaper models.',
                savings: '$0.05/run',
                currentModel: 'GPT-4',
                recommendedModel: 'GPT-3.5 Turbo',
                taskType: 'Data validation',
                fix: {
                    explanation: 'JSON validation is deterministic and doesn\'t benefit from advanced reasoning. Consider using a JSON schema library for even better results.',
                    code: `# Option 1: Use cheaper model
model = "gpt-3.5-turbo"

# Option 2: Use a library (no LLM needed!)
from jsonschema import validate
validate(instance=data, schema=schema)`,
                    taskComplexity: {
                        level: 'Simple',
                        reasons: ['Deterministic validation', 'No reasoning required', 'Consider non-LLM solution'],
                    },
                    costComparison: {
                        current: '$0.030/1K tokens',
                        recommended: '$0.0005/1K tokens',
                        savingsPercent: 98,
                    },
                },
            },
        ],
        contextBloatFindings: [
            {
                id: 'c1',
                description: 'Full document history in every call',
                details: 'Each call includes complete 45-page document when only current section is relevant.',
                savings: '$0.18/run',
                currentTokens: 12500,
                optimizedTokens: 1800,
                fix: {
                    strategy: 'Chunk',
                    explanation: 'Only include the relevant document section instead of the full document in each call.',
                    code: `# Before: Full document in every call
response = llm.complete(
    system="Analyze this document",
    context=full_document  # 12,500 tokens!
)

# After: Only relevant section
response = llm.complete(
    system="Analyze this section",
    context=current_section  # 1,800 tokens
)`,
                },
            },
            {
                id: 'c2',
                description: 'Conversation history accumulation',
                details: 'Full conversation history included but only last 2 exchanges were relevant.',
                savings: '$0.09/run',
                currentTokens: 8500,
                optimizedTokens: 1200,
                fix: {
                    strategy: 'Trim History',
                    explanation: 'Keep only the last N messages instead of full conversation history.',
                    code: `def trim_history(messages, keep_last=6):
    """Keep system prompt + last N messages"""
    system = messages[0]  # Preserve system prompt
    recent = messages[-keep_last:]
    return [system] + recent

# Usage
messages = trim_history(conversation, keep_last=4)`,
                },
            },
            {
                id: 'c3',
                description: 'Repeated system prompts',
                details: 'Identical 2000-token system prompt sent with every call instead of being cached.',
                savings: '$0.15/run',
                currentTokens: 2000,
                optimizedTokens: 0,
                fix: {
                    strategy: 'Cache Prompt',
                    explanation: 'Use prompt caching or move to a shorter system prompt that references cached instructions.',
                    code: `# With OpenAI/Anthropic prompt caching
# The system prompt is automatically cached after first use

# Or: Use a minimal system prompt
SYSTEM = "Medical translator. Plain English. Be concise."

# Instead of the verbose 2000-token version`,
                },
            },
            {
                id: 'c4',
                description: 'Unnecessary metadata in context',
                details: 'File metadata, timestamps, and debug info included in production prompts.',
                savings: '$0.04/run',
                currentTokens: 3200,
                optimizedTokens: 400,
                fix: {
                    strategy: 'Clean Context',
                    explanation: 'Strip debug information and unnecessary metadata before sending to the LLM.',
                    code: `def clean_context(data):
    """Remove unnecessary fields before LLM call"""
    exclude = ['debug', 'timestamps', 'file_metadata', '_internal']
    return {k: v for k, v in data.items() if k not in exclude}

context = clean_context(raw_context)`,
                },
            },
        ],
    },
    {
        id: '2',
        name: 'Customer Support Bot',
        timestamp: '2026-01-08T09:15:00Z',
        callCount: 45,
        totalCost: 1.80,
        optimizedCost: 0.95,
        efficiencyScore: 72,
        redundancyScore: 85,
        modelFitScore: 68,
        contextEfficiencyScore: 71,
        status: 'analyzed',
        redundancyFindings: [
            {
                id: 'r1',
                description: 'Duplicate intent classification',
                details: 'Intent classified twice at message intake and again before routing.',
                savings: '$0.01/run',
                confidence: 90,
                callIds: ['Call #3', 'Call #8'],
                fix: {
                    strategy: 'Share State',
                    explanation: 'Store the intent classification result from the intake step and pass it to the routing step.',
                    code: `# At message intake (Call #3)
intent = classify_intent(message)
context["user_intent"] = intent

# At routing (Call #8) - reuse instead of reclassify
intent = context.get("user_intent")`,
                },
            },
        ],
        modelOverkillFindings: [
            {
                id: 'm1',
                description: 'GPT-4 for FAQ matching',
                details: 'Simple semantic matching to predefined FAQ responses could use embedding search.',
                savings: '$0.06/run',
                currentModel: 'GPT-4',
                recommendedModel: 'Text Embedding + Search',
                taskType: 'FAQ matching',
                fix: {
                    explanation: 'FAQ matching is a retrieval task, not a generation task. Vector similarity search is faster and cheaper.',
                    code: `# Before: Using GPT-4 for FAQ matching
answer = llm.complete(f"Match to FAQ: {question}")

# After: Vector similarity search
from openai import embeddings
query_vec = embeddings.create(question)
faq_match = vector_db.similarity_search(query_vec, k=1)`,
                    taskComplexity: {
                        level: 'Simple',
                        reasons: ['Retrieval, not generation', 'Fixed answer set', 'No reasoning needed'],
                    },
                    costComparison: {
                        current: '$0.030/1K tokens',
                        recommended: '$0.0001/1K tokens',
                        savingsPercent: 99,
                    },
                },
            },
            {
                id: 'm2',
                description: 'Claude 3 for sentiment detection',
                details: 'Basic positive/negative/neutral classification can use lightweight model.',
                savings: '$0.04/run',
                currentModel: 'Claude 3 Sonnet',
                recommendedModel: 'DistilBERT',
                taskType: 'Sentiment analysis',
                fix: {
                    explanation: 'Sentiment classification is a well-solved problem. Small specialized models outperform LLMs here.',
                    code: `# Before: Claude 3 Sonnet
sentiment = llm.complete("Classify sentiment: {text}")

# After: DistilBERT (local, instant, free)
from transformers import pipeline
classifier = pipeline("sentiment-analysis")
sentiment = classifier(text)[0]["label"]`,
                    taskComplexity: {
                        level: 'Simple',
                        reasons: ['3-class classification', 'Well-solved problem', 'Specialized models exist'],
                    },
                    costComparison: {
                        current: '$0.003/1K tokens',
                        recommended: '$0 (local)',
                        savingsPercent: 100,
                    },
                },
            },
        ],
        contextBloatFindings: [
            {
                id: 'c1',
                description: 'Full ticket history in context',
                details: 'Complete support ticket history included when only current conversation matters.',
                savings: '$0.05/run',
                currentTokens: 4200,
                optimizedTokens: 800,
                fix: {
                    strategy: 'Summarize',
                    explanation: 'Summarize older ticket history into a brief context instead of including full messages.',
                    code: `# Before: Full ticket history
context = "\\n".join(all_ticket_messages)

# After: Summary + recent messages
summary = summarize_history(older_messages)
recent = ticket_messages[-3:]
context = f"Previous context: {summary}\\n\\n" + "\\n".join(recent)`,
                },
            },
        ],
    },
    {
        id: '3',
        name: 'Research Agent',
        timestamp: '2026-01-08T08:00:00Z',
        callCount: 120,
        totalCost: 5.20,
        optimizedCost: 5.20,
        efficiencyScore: null,
        redundancyScore: null,
        modelFitScore: null,
        contextEfficiencyScore: null,
        status: 'pending',
        redundancyFindings: [],
        modelOverkillFindings: [],
        contextBloatFindings: [],
    },
];

export const getWorkflowById = (id: string): Workflow | undefined => {
    if (id === 'demo-legacy') return demoLegacy;
    if (id === 'demo-optimized') return demoOptimized;
    return workflows.find((w) => w.id === id);
};

export const demoLegacy: Workflow = {
    id: 'demo-legacy',
    name: 'Enterprise Customer Support (Legacy)',
    timestamp: new Date().toISOString(),
    callCount: 154200,
    totalCost: 15840.50,
    optimizedCost: 2145.20,
    efficiencyScore: 32,
    redundancyScore: 45,
    modelFitScore: 28,
    contextEfficiencyScore: 24,
    status: 'analyzed',
    redundancyFindings: [
        {
            id: 'r1',
            description: 'Looping Intent Classification (Recursive)',
            details: 'Intent classification triggers on every single message in a thread, even for replies where intent is already known. 85,000+ redundant calls wasting compute.',
            savings: '$6,420.45/run',
            confidence: 99,
            callIds: ['All Active Threads', 'Recursive Loops'],
            prompts: {
                'Original Call': 'User: "My bill is wrong" -> Classify -> "Billing"',
                'Redundant Call 1': 'Agent: "I can help." -> Classify -> "Billing" (Unnecessary)',
                'Redundant Call 2': 'User: "Thanks" -> Classify -> "Billing" (Unnecessary)'
            },
            fix: {
                strategy: 'State Management',
                explanation: 'Classify intent once per thread/session and store in state. Only re-classify if the topic explicitly shifts.',
                code: `# Cache results to avoid redundant calls
class SessionManager:
    def get_intent(self, session, message):
        # 1. Check if intent is already cached for this session
        if session.get("intent"):
            return session["intent"]
            
        # 2. Only call LLM if missing
        intent = llm.classify(message)
        session["intent"] = intent
        return intent

# Usage
current_intent = session_manager.get_intent(user_session, user_message)`,
            },
        },
        {
            id: 'r2',
            description: 'Redundant PII Scrubbing Loop',
            details: 'PII scrubbing runs on raw input AND again on intermediate steps in the decision tree.',
            savings: '$2,980.30/run',
            confidence: 95,
            callIds: ['Input', 'Pre-process', 'Routing'],
            fix: {
                strategy: 'Pipeline Optimization',
                explanation: 'Scrub PII once at the API ingress point. Mark the payload as "clean" and bypass downstream scrubbers.',
                code: `# Middleware pattern for single-pass PII scrubbing
def pii_middleware(request):
    raw_text = request.body
    
    # 1. Clean once at entry
    clean_text = pii_service.scrub(raw_text)
    
    # 2. Attach clean text to request context
    request.state.clean_text = clean_text
    
    return process_request(request)

# Downstream handlers use request.state.clean_text directly`,
            },
        }
    ],
    modelOverkillFindings: [
        {
            id: 'm1',
            description: 'GPT-4 for Boolean Routing (98% Overkill)',
            details: 'Using the most expensive model (GPT-4) for a trivial "Sales vs Support" routing decision. This is a 1-second task costing $0.03/call instead of $0.0005.',
            savings: '$4,240.10/run',
            currentModel: 'GPT-4 (Expensive)',
            recommendedModel: 'GPT-4o-mini',
            taskType: 'Simple Classification',
            promptSnippet: 'Classify this ticket: "I want to buy a new license." Options: [Sales, Support].',
            fix: {
                explanation: 'Routing is a simple classification task. Smaller models achieve 99% accuracy for 1/50th the price.',
                code: `# Route simple tasks to cheaper models
SIMPLE_TASKS = ['classify_intent', 'route_ticket', 'extract_date']

def get_model_for_task(task_type):
    # Use cheaper model for known simple tasks
    if task_type in SIMPLE_TASKS:
        return 'gpt-4o-mini'  # or 'gemini-2.5-flash-lite'
        
    # Keep powerful model for complex reasoning
    return 'gpt-4-turbo'

model = get_model_for_task('route_ticket')`,
                costComparison: {
                    current: '$0.03/1k',
                    recommended: '$0.0005/1k',
                    savingsPercent: 98
                }
            },
        }
    ],
    contextBloatFindings: [
        {
            id: 'c1',
            description: 'Context Flooding (25k Tokens / Call)',
            details: 'Injecting the ENTIRE 50-page usage manual into the context window for every single user query, even for simple "Hello" messages.',
            savings: '$2,161.85/run',
            currentTokens: 25000,
            optimizedTokens: 500,
            promptSnippet: 'You are a helpful assistant. Here is the entire product manual: [INSERT 50 PAGES OF TEXT]... Question: "How do I reset password?"',
            unnecessaryContent: '[Pages 1-49 of completely irrelevant documentation, legal disclaimers, and legacy API references]',
            fix: {
                strategy: 'RAG (Retrieval Augmented Generation)',
                explanation: 'Use vector search to retrieve only the 3-5 most relevant FAQ sections instead of injecting the entire knowledge base.',
                code: `# Before: prompt = full_faq_doc + question (25k tokens)

# After: RAG pattern
def build_prompt(question):
    # 1. Retrieve only relevant chunks
    relevant_chunks = vector_db.similarity_search(question, k=3)
    context_str = "\\n".join(c.text for c in relevant_chunks)
    
    # 2. Build concise prompt (500 tokens)
    return f"Context: {context_str}\\n\\nQuestion: {question}"`,
            },
        }
    ]
};

export const demoOptimized: Workflow = {
    id: 'demo-optimized',
    name: 'Enterprise Customer Support (Optimized)',
    timestamp: new Date().toISOString(),
    callCount: 154200,
    totalCost: 2145.20,
    optimizedCost: 1980.50, // Slightly lower optimized cost to show room for improvement
    efficiencyScore: 89,    // Lowered from 94
    redundancyScore: 98,
    modelFitScore: 85,
    contextEfficiencyScore: 88,
    status: 'analyzed',
    redundancyFindings: [],
    modelOverkillFindings: [
        {
            id: 'm_opt_1',
            description: 'Strategic Overkill: GPT-4 for Sentiment',
            details: 'We deliberately use GPT-4 for sentiment analysis on escalated tickets to ensure maximum empathy and accuracy, despite the cost.',
            savings: '$120.10/run',
            currentModel: 'GPT-4',
            recommendedModel: 'GPT-3.5-turbo',
            taskType: 'Sentiment Analysis',
            promptSnippet: 'Analyze this angry customer message with high sensitivity. Message: "I am extremely frustrated with your service!"',
            fix: {
                explanation: 'A smaller model could handle this, but we retain GPT-4 for higher safety on escalations. Only fix if cost reduction is critical.',
                code: '# Intentional Trade-off: Keeping GPT-4 for safety\nmodel = "gpt-4" # vs "gpt-3.5-turbo"',
                taskComplexity: {
                    level: 'Medium',
                    reasons: ['Tone sensitivity', 'High stakes escalation', 'Safety priority'],
                }
            },
        }
    ],
    contextBloatFindings: [
        {
            id: 'c_opt_1',
            description: 'Personalization "Bloat" (Intentional)',
            details: 'We include the last 5 orders in the context even for general queries. This allows the agent to be proactive ("Are you asking about Order #123?").',
            savings: '$45.60/run',
            currentTokens: 1200,
            optimizedTokens: 400,
            promptSnippet: 'Context: { User: "Alice", RecentOrders: [Order #101, Order #102, Order #103...] } Question: "What are your shipping times?"',
            unnecessaryContent: '[Details of 5 past delivered orders that are technically not needed to answer a generic shipping question]',
            fix: {
                strategy: 'Context Pruning',
                explanation: 'We could trim strictly to the active order, but keeping recent history helps with personalization. Low priority fix.',
                code: '# Personalization Trade-off\ncontext["history"] = last_5_orders # vs last_1_order',
            },
        }
    ]
};

export const getSummaryStats = () => {
    const analyzedWorkflows = workflows.filter((w) => w.status === 'analyzed');
    const totalWorkflows = workflows.length;
    const averageScore = analyzedWorkflows.length > 0
        ? Math.round(analyzedWorkflows.reduce((sum, w) => sum + (w.efficiencyScore || 0), 0) / analyzedWorkflows.length)
        : 0;
    const totalSavings = analyzedWorkflows.reduce((sum, w) => sum + (w.totalCost - w.optimizedCost), 0);

    return {
        totalWorkflows,
        averageScore,
        totalSavings: totalSavings.toFixed(2),
    };
};
