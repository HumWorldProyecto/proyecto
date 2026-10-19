import { Inject, Injectable } from '@nestjs/common';
import { DictionaryTermNormalizer } from '../../dictionary/domain/dictionary-term-normalizer';
import {
  DICTIONARY_READER_PORT,
  DictionaryReaderPort,
} from '../../dictionary/ports/dictionary-reader.port';
import { DictionaryEntry } from '../../dictionary/types/dictionary-entry';
import { SentimentDictionaryReadError } from '../errors/sentiment-analysis.error';
import { SentimentAnalyzerPort } from '../ports/sentiment-analyzer.port';
import {
  SentimentAnalysisInput,
  SentimentAnalysisResult,
  SentimentLanguage,
} from '../types/sentiment-analysis';

type PreparedEntry = Readonly<{
  id: string;
  tokens: readonly string[];
  weight: number;
}>;

export function roundHalfAwayFromZero(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const magnitude = Math.abs(value) * factor;
  const tolerance = Number.EPSILON * Math.max(1, magnitude) * 4;
  const rounded = (Math.sign(value) * Math.floor(magnitude + 0.5 + tolerance)) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function calculateSentimentScore(totalWeight: number, matchedTerms: number): number {
  if (matchedTerms === 0) {
    return 0;
  }
  const raw = totalWeight / (5 * matchedTerms);
  const bounded = Math.min(1, Math.max(-1, raw));
  return roundHalfAwayFromZero(bounded, 4);
}

@Injectable()
export class DictionarySentimentAnalyzer implements SentimentAnalyzerPort {
  constructor(
    @Inject(DICTIONARY_READER_PORT)
    private readonly dictionaryReader: DictionaryReaderPort,
    private readonly normalizer: DictionaryTermNormalizer,
  ) {}

  async analyze(input: SentimentAnalysisInput): Promise<SentimentAnalysisResult> {
    this.normalizer.assertLanguage(input.language);
    const segments = input.segments.map((segment) => this.tokenize(segment, input.language));

    if (segments.every((tokens) => tokens.length === 0)) {
      return Object.freeze({ score: 0, matchedTerms: 0 });
    }

    let entries: readonly DictionaryEntry[];
    try {
      entries = await this.dictionaryReader.listByLanguage(input.language);
    } catch {
      throw new SentimentDictionaryReadError();
    }

    const prepared = this.prepareEntries(entries, input.language);
    let totalWeight = 0;
    let matchedTerms = 0;

    for (const tokens of segments) {
      let position = 0;
      while (position < tokens.length) {
        const match = prepared.find((entry) => this.matchesAt(tokens, position, entry.tokens));
        if (!match) {
          position += 1;
          continue;
        }
        totalWeight += match.weight;
        matchedTerms += 1;
        position += match.tokens.length;
      }
    }

    return Object.freeze({
      score: calculateSentimentScore(totalWeight, matchedTerms),
      matchedTerms,
    });
  }

  private tokenize(
    segment: string | null | undefined,
    language: SentimentLanguage,
  ): readonly string[] {
    if (typeof segment !== 'string') {
      return Object.freeze([]);
    }
    const withoutTags = segment.replace(/<[^>]*>/g, ' ');
    const normalized = this.normalizer.normalize(withoutTags, language);
    return Object.freeze(normalized.length === 0 ? [] : normalized.split(' '));
  }

  private prepareEntries(
    entries: readonly DictionaryEntry[],
    language: SentimentLanguage,
  ): readonly PreparedEntry[] {
    return entries
      .filter((entry) => entry.language === language)
      .map((entry) => ({
        id: entry.id,
        tokens: Object.freeze(this.normalizer.normalize(entry.term, language).split(' ')),
        weight: entry.weight,
      }))
      .filter((entry) => entry.tokens.length > 0 && entry.tokens[0].length > 0)
      .sort(
        (left, right) =>
          right.tokens.length - left.tokens.length || left.id.localeCompare(right.id),
      );
  }

  private matchesAt(
    haystack: readonly string[],
    position: number,
    needle: readonly string[],
  ): boolean {
    return needle.every((token, offset) => haystack[position + offset] === token);
  }
}
