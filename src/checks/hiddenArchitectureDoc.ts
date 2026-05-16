import type { AgentInstructionDocFact, ArchitectureDocFact, Check, CheckContext, Finding } from '../core/types.js';

export const hiddenArchitectureDocCheck: Check = {
  id: 'hidden-architecture-doc',
  run(context: CheckContext): Finding[] {
    return context.facts.architectureDocs.flatMap((doc) => {
      if (isExactPathMentionedByAgentInstructions(doc, context.facts.agentInstructionDocs)) {
        return [];
      }

      const genericReference = genericArchitectureReference(context.facts.agentInstructionDocs);

      return [
        {
          id: this.id,
          title: `${doc.path} exists but agent instructions do not mention it`,
          category: 'architecture-doc',
          severity: 'warning',
          confidence: 'high',
          primarySource: doc.source,
          evidence: [
            {
              kind: 'architecture-doc',
              message: `${doc.path} appears to be an architecture source of truth.`,
              source: doc.source
            },
            genericReference
              ? {
                  kind: 'generic-architecture-reference',
                  message: `Agent instructions mention architecture docs generically but do not name ${doc.path}.`,
                  source: genericReference
                }
              : {
                  kind: 'agent-instructions',
                  message: `Agent-visible instructions do not mention ${doc.path}.`,
                  source: firstInstructionSource(context.facts.agentInstructionDocs)
                }
          ],
          suggestion: genericReference
            ? `Mention ${doc.path} exactly in agent-visible first-read instructions.`
            : `Mention ${doc.path} in agent-visible first-read instructions.`
        }
      ];
    });
  }
};

function isExactPathMentionedByAgentInstructions(doc: ArchitectureDocFact, instructionDocs: AgentInstructionDocFact[]): boolean {
  const path = doc.path.toLowerCase();

  return instructionDocs.some((instructionDoc) => {
    const content = instructionDoc.content.toLowerCase();
    return content.includes(path);
  });
}

function genericArchitectureReference(instructionDocs: AgentInstructionDocFact[]) {
  for (const instructionDoc of instructionDocs) {
    const lines = instructionDoc.content.split('\n');
    const index = lines.findIndex((line) => /\barchitecture(?:\s+docs?)?\b/i.test(line));
    if (index !== -1) {
      return {
        file: instructionDoc.path,
        line: index + 1,
        text: lines[index].trim()
      };
    }
  }

  return undefined;
}

function firstInstructionSource(instructionDocs: AgentInstructionDocFact[]) {
  return instructionDocs[0]?.source;
}
