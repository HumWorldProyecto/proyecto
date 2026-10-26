import {
  SentimentAnalysisInput,
  SentimentAnalysisResult,
  SentimentLanguage,
} from '../types/sentiment-analysis';

export type SentimentTermEvidence = Readonly<{
  term: string;
  language: SentimentLanguage;
  weight: number;
  occurrences: number;
}>;

export type SentimentEvidenceResult = SentimentAnalysisResult &
  Readonly<{
    terms: readonly SentimentTermEvidence[];
  }>;

export interface SentimentEvidenceAnalyzerPort {
  analyzeWithEvidence(input: SentimentAnalysisInput): Promise<SentimentEvidenceResult>;
}

export const SENTIMENT_EVIDENCE_ANALYZER_PORT = Symbol('SENTIMENT_EVIDENCE_ANALYZER_PORT');
