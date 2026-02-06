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
    description?: string;
    timestamp: string;
    startTime?: string;
    endTime?: string;
    callCount: number;
    totalCost: number;
    optimizedCost: number;
    efficiencyScore: number | null;
    optimizedScore: number | null;
    redundancyScore: number | null;
    modelFitScore: number | null;
    contextEfficiencyScore: number | null;
    status: 'pending' | 'analyzed';
    redundancyFindings: Finding[];
    modelOverkillFindings: Finding[];
    contextBloatFindings: Finding[];
    // Graph Data for Timeline
    nodes?: any[];
    edges?: any[];
    metrics?: any;
    events?: any[];
}

export interface DependencyGraphData {
    calls: GraphCall[];
    edges: Array<{ source: string; target: string; overlap: number }>;
    deadBranchCost: number;
    criticalPathLatency: number;
    totalCost: number;
    informationEfficiency: number;
    parallelizationPotential: number;
}

export interface GraphEdge {
    source: string;
    target: string;
    overlap: number;
}



export interface GraphCall {
    id: string;
    agent: string;
    cost: number;
    latency: number;
    tokens: number;
    tokens_in?: number;
    tokens_out?: number;
    model: string;

    // Status flags
    isDeadBranch?: boolean;
    isCriticalPath?: boolean;
    isRedundant?: boolean;
    isOverkill?: boolean;
    isBloated?: boolean;
    hasSecurityRisk?: boolean;

    // Analysis details
    vulnerabilityType?: string;
    reason?: string;
    recommendedModel?: string;
    redundantWithId?: string;
    redundantWithIndex?: number;

    // Payload
    input?: string;
    prompt?: string;
    output?: string;
    response?: string;

    // Graph specific
    index?: number;
    label?: string;
}
