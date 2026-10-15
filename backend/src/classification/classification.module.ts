import { Module } from '@nestjs/common';
import { MEDIA_TOPIC_CLASSIFIER_PORT } from './ports/media-topic-classifier.port';
import { RuleBasedMediaTopicClassifier } from './services/rule-based-media-topic-classifier';

@Module({
  providers: [
    RuleBasedMediaTopicClassifier,
    { provide: MEDIA_TOPIC_CLASSIFIER_PORT, useExisting: RuleBasedMediaTopicClassifier },
  ],
  exports: [MEDIA_TOPIC_CLASSIFIER_PORT],
})
export class ClassificationModule {}
