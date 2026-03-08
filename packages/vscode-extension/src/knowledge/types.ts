/**
 * Types for team knowledge cards and retrieval.
 */

export type KnowledgeScene = 'chat' | 'agent' | 'coding' | 'other';
export type SummaryMode = 'off' | 'cheap' | 'smart';

export interface KnowledgeFeedback {
  usefulCount: number;
  notUsefulCount: number;
  lastFeedbackAt?: string;
}

export interface KnowledgeMeta {
  sourceRefs: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface KnowledgeCard {
  id: string;
  schemaVersion: 1;
  title: string;
  scene: KnowledgeScene;
  tags: string[];
  questionPattern: string;
  problemFingerprint: string;
  rootCause: string;
  solutionSteps: string[];
  commands: string[];
  pitfalls: string[];
  validation: string[];
  qualityScore: number;
  feedback: KnowledgeFeedback;
  meta: KnowledgeMeta;
}

export interface RetrievalResult {
  card: KnowledgeCard;
  score: number;
  reason: string[];
}

export interface LastTurnMemory {
  question: string;
  answer: string;
  matchedCardIds: string[];
}

export interface FeedbackEvent {
  id: string;
  cardId: string;
  value: 'useful' | 'not_useful';
  timestamp: string;
  actor: string;
  sessionId: string;
}

