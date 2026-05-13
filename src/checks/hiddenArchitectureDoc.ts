import type { AgentInstructionDocFact, ArchitectureDocFact, Check, CheckContext, Finding } from '../core/types.js';

export const hiddenArchitectureDocCheck: Check = {
  id: 'hidden-architecture-doc',
  run(context: CheckContext): Finding[] {
    return context.facts.architectureDocs.flatMap((doc) => {
      if (isMentionedByAgentInstructions(doc, context.facts.agentInstructionDocs)) {
        return [];
      }

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
            {
              kind: 'agent-instructions',
              message: `Agent-visible instructions do not mention ${doc.path}.`,
              source: firstInstructionSource(context.facts.agentInstructionDocs)
            }
          ],
          suggestion: `Mention ${doc.path} in agent-visible first-read instructions.`
        }
      ];
    });
  }
};

function isMentionedByAgentInstructions(doc: ArchitectureDocFact, instructionDocs: AgentInstructionDocFact[]): boolean {
  const path = doc.path.toLowerCase();
  const basename = path.split('/').at(-1) ?? path;

  return instructionDocs.some((instructionDoc) => {
    const content = instructionDoc.content.toLowerCase();
    return content.includes(path) || content.includes(basename);
  });
}

function firstInstructionSource(instructionDocs: AgentInstructionDocFact[]) {
  return instructionDocs[0]?.source;
}
