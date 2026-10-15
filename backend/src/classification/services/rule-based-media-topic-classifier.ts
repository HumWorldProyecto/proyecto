import { Injectable } from '@nestjs/common';
import {
  MediaTopicClassificationInput,
  MediaTopicClassifierPort,
} from '../ports/media-topic-classifier.port';
import { MEDIA_TOPIC_CLASSIFICATION_RULES } from '../rules/media-topic-classification-rules';
import { MediaTopicQCode } from '../types/media-topic';

interface TokenRange {
  readonly start: number;
  readonly end: number;
}

function normalize(value: string): string[] {
  return value
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function findRanges(tokens: readonly string[], phrase: readonly string[]): TokenRange[] {
  if (phrase.length === 0 || phrase.length > tokens.length) {
    return [];
  }

  const ranges: TokenRange[] = [];
  for (let start = 0; start <= tokens.length - phrase.length; start += 1) {
    if (phrase.every((token, offset) => tokens[start + offset] === token)) {
      ranges.push({ start, end: start + phrase.length });
    }
  }
  return ranges;
}

function fieldMatchesRule(
  tokens: readonly string[],
  triggers: readonly string[],
  exclusions: readonly string[],
): boolean {
  const excludedRanges = exclusions.flatMap((phrase) => findRanges(tokens, normalize(phrase)));

  return triggers.some((trigger) =>
    findRanges(tokens, normalize(trigger)).some(
      (match) =>
        !excludedRanges.some(
          (excluded) => excluded.start <= match.start && excluded.end >= match.end,
        ),
    ),
  );
}

@Injectable()
export class RuleBasedMediaTopicClassifier implements MediaTopicClassifierPort {
  classify(input: MediaTopicClassificationInput): readonly MediaTopicQCode[] {
    const fields = [input.title ?? '', input.description ?? ''].map(normalize);

    return MEDIA_TOPIC_CLASSIFICATION_RULES.filter((rule) =>
      fields.some((tokens) => fieldMatchesRule(tokens, rule.triggers, rule.exclusions)),
    ).map((rule) => rule.qcode);
  }
}
