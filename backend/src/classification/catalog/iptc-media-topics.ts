import {
  MEDIA_TOPIC_QCODES,
  MediaTopic,
  MediaTopicQCode,
} from '../types/media-topic';

export const IPTC_MEDIA_TOPICS_RELEASE = '2026-07-02T12:00:00+00:00';
export const IPTC_MEDIA_TOPICS_SOURCE = 'https://cv.iptc.org/newscodes/mediatopic/';
export const IPTC_MEDIA_TOPICS_LICENSE = 'CC BY 4.0';

const labels = [
  'Artes, cultura, entretenimiento y medios',
  'Policía y justicia',
  'Catástrofes y accidentes',
  'Economía, negocios y finanzas',
  'Educación',
  'Medio ambiente',
  'Salud',
  'Interés humano, animales, insólito',
  'Mano de obra',
  'Estilo de vida y tiempo libre',
  'Política',
  'Religión y culto',
  'Ciencia y tecnología',
  'Sociedad',
  'Deporte',
  'Conflicto, guerra y paz',
  'Meteorología',
] as const;

export const IPTC_MEDIA_TOPICS: readonly MediaTopic[] = MEDIA_TOPIC_QCODES.map(
  (qcode, index) => ({
    qcode,
    uri: `http://cv.iptc.org/newscodes/mediatopic/${qcode.slice('medtop:'.length)}`,
    label: labels[index],
  }),
);

const topicsByQCode = new Map(IPTC_MEDIA_TOPICS.map((topic) => [topic.qcode, topic]));

export function isOfficialMediaTopicQCode(value: string): value is MediaTopicQCode {
  return topicsByQCode.has(value as MediaTopicQCode);
}

export function resolveOfficialMediaTopics(qcodes: readonly string[]): MediaTopic[] {
  const selected = new Set(qcodes.filter(isOfficialMediaTopicQCode));
  return IPTC_MEDIA_TOPICS.filter((topic) => selected.has(topic.qcode));
}
