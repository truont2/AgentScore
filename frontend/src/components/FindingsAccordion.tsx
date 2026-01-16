import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Zap, Package, AlertTriangle } from 'lucide-react';
import type { Finding } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { FixSuggestion } from '@/components/FixSuggestion';

interface FindingsAccordionProps {
  redundancyFindings: Finding[];
  modelOverkillFindings: Finding[];
  contextBloatFindings: Finding[];
}

interface FindingCardProps {
  finding: Finding;
  type: 'redundancy' | 'model' | 'context';
}

function FindingCard({ finding, type }: FindingCardProps) {
  return (
    <Card className="p-4 bg-muted/30 border-border/50">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-medium text-sm text-foreground">{finding.description}</h4>
          <Badge variant="outline" className="bg-score-good/10 text-score-good border-score-good/30 shrink-0">
            {finding.savings}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">{finding.details}</p>
        
        <div className="flex flex-wrap gap-2 text-xs">
          {type === 'redundancy' && finding.callIds && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Calls:</span>
              {finding.callIds.map((callId) => (
                <Badge key={callId} variant="secondary" className="font-mono text-xs">
                  {callId}
                </Badge>
              ))}
            </div>
          )}
          
          {type === 'redundancy' && finding.confidence && (
            <Badge variant="outline" className="text-muted-foreground">
              {finding.confidence}% confidence
            </Badge>
          )}
          
          {type === 'model' && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-score-poor/10 text-score-poor border-score-poor/30">
                {finding.currentModel}
              </Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="secondary" className="bg-score-good/10 text-score-good border-score-good/30">
                {finding.recommendedModel}
              </Badge>
              {finding.taskType && (
                <span className="text-muted-foreground ml-2">({finding.taskType})</span>
              )}
            </div>
          )}
          
          {type === 'context' && finding.currentTokens && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tokens:</span>
              <Badge variant="secondary" className="bg-score-poor/10 text-score-poor border-score-poor/30 font-mono">
                {finding.currentTokens.toLocaleString()}
              </Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="secondary" className="bg-score-good/10 text-score-good border-score-good/30 font-mono">
                {finding.optimizedTokens?.toLocaleString() || '0'}
              </Badge>
            </div>
          )}
        </div>
        
        {finding.fix && (
          <FixSuggestion fix={finding.fix} defaultOpen={false} />
        )}
      </div>
    </Card>
  );
}

export function FindingsAccordion({ redundancyFindings, modelOverkillFindings, contextBloatFindings }: FindingsAccordionProps) {
  const sections = [
    {
      id: 'redundancy',
      title: 'Redundant Calls Found',
      icon: <RefreshCw className="w-4 h-4" />,
      findings: redundancyFindings,
      type: 'redundancy' as const,
    },
    {
      id: 'model',
      title: 'Model Overkill',
      icon: <Zap className="w-4 h-4" />,
      findings: modelOverkillFindings,
      type: 'model' as const,
    },
    {
      id: 'context',
      title: 'Context Bloat',
      icon: <Package className="w-4 h-4" />,
      findings: contextBloatFindings,
      type: 'context' as const,
    },
  ];

  return (
    <Accordion type="multiple" defaultValue={['redundancy', 'model', 'context']} className="space-y-3">
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          value={section.id}
          className="border border-border rounded-lg bg-card overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-md',
                section.findings.length > 0 ? 'bg-score-warning/10 text-score-warning' : 'bg-muted text-muted-foreground'
              )}>
                {section.icon}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{section.title}</span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-xs',
                    section.findings.length > 0 
                      ? 'bg-score-warning/10 text-score-warning' 
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {section.findings.length} {section.findings.length === 1 ? 'issue' : 'issues'}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {section.findings.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <AlertTriangle className="w-4 h-4" />
                <span>No issues found in this category</span>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {section.findings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} type={section.type} />
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
