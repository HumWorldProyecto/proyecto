import {
  SentimentAnalysisInput,
  SentimentAnalysisResult,
} from '../types/sentiment-analysis';

export interface SentimentAnalyzerPort {
  analyze(input: SentimentAnalysisInput): Promise<SentimentAnalysisResult>;
}

export const SENTIMENT_ANALYZER_PORT = Symbol('SENTIMENT_ANALYZER_PORT');
