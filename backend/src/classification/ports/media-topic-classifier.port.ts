import { MediaTopicQCode } from '../types/media-topic';

export interface MediaTopicClassificationInput {
  readonly title?: string | null;
  readonly description?: string | null;
}

export interface MediaTopicClassifierPort {
  classify(input: MediaTopicClassificationInput): readonly MediaTopicQCode[];
}

export const MEDIA_TOPIC_CLASSIFIER_PORT = Symbol('MEDIA_TOPIC_CLASSIFIER_PORT');
