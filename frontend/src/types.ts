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
    // Graph Data for Timeline
    nodes?: any[];
    edges?: any[];
    metrics?: any;
}
