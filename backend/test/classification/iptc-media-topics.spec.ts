import {
  IPTC_MEDIA_TOPICS,
  IPTC_MEDIA_TOPICS_LICENSE,
  IPTC_MEDIA_TOPICS_RELEASE,
  IPTC_MEDIA_TOPICS_SOURCE,
  isOfficialMediaTopicQCode,
  resolveOfficialMediaTopics,
} from '../../src/classification/catalog/iptc-media-topics';
import { MEDIA_TOPIC_QCODES } from '../../src/classification/types/media-topic';

describe('catálogo raíz IPTC Media Topics', () => {
  it('contiene exactamente los 17 QCodes oficiales en orden', () => {
    expect(IPTC_MEDIA_TOPICS).toHaveLength(17);
    expect(IPTC_MEDIA_TOPICS.map(({ qcode }) => qcode)).toEqual(MEDIA_TOPIC_QCODES);
    expect(IPTC_MEDIA_TOPICS_RELEASE).toBe('2026-07-02T12:00:00+00:00');
    expect(IPTC_MEDIA_TOPICS_SOURCE).toBe('https://cv.iptc.org/newscodes/mediatopic/');
    expect(IPTC_MEDIA_TOPICS_LICENSE).toBe('CC BY 4.0');
  });

  it('publica URI y nombre oficial español para cada concepto', () => {
    expect(IPTC_MEDIA_TOPICS).toEqual(
      expect.arrayContaining([
        {
          qcode: 'medtop:01000000',
          uri: 'http://cv.iptc.org/newscodes/mediatopic/01000000',
          label: 'Artes, cultura, entretenimiento y medios',
        },
        {
          qcode: 'medtop:17000000',
          uri: 'http://cv.iptc.org/newscodes/mediatopic/17000000',
          label: 'Meteorología',
        },
      ]),
    );
  });

  it('filtra QCodes ajenos, elimina duplicados y restaura el orden oficial', () => {
    expect(
      resolveOfficialMediaTopics([
        'medtop:17000000',
        'medtop:01000000',
        'medtop:17000000',
        'medtop:99999999',
      ]),
    ).toEqual([IPTC_MEDIA_TOPICS[0], IPTC_MEDIA_TOPICS[16]]);
    expect(isOfficialMediaTopicQCode('medtop:13000000')).toBe(true);
    expect(isOfficialMediaTopicQCode('medtop:99999999')).toBe(false);
  });
});
