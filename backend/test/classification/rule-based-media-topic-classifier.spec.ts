import { RuleBasedMediaTopicClassifier } from '../../src/classification/services/rule-based-media-topic-classifier';
import { MEDIA_TOPIC_CLASSIFICATION_RULES } from '../../src/classification/rules/media-topic-classification-rules';
import { EDITORIAL_EXAMPLES } from './editorial-examples.fixture';

describe('RuleBasedMediaTopicClassifier', () => {
  const classifier = new RuleBasedMediaTopicClassifier();

  const positiveCases = EDITORIAL_EXAMPLES.flatMap(({ qcode, positives }) =>
    positives.map((text, index) => ({ qcode, text, index: index + 1 })),
  );
  const negativeCases = EDITORIAL_EXAMPLES.flatMap(({ qcode, negatives }) =>
    negatives.map((text, index) => ({ qcode, text, index: index + 1 })),
  );

  it.each(positiveCases)('acepta el ejemplo positivo $qcode/$index', ({ qcode, text }) => {
    expect(classifier.classify({ title: text })).toContain(qcode);
  });

  it.each(negativeCases)('rechaza el ejemplo negativo $qcode/$index', ({ qcode, text }) => {
    expect(classifier.classify({ title: text })).not.toContain(qcode);
  });

  it('reconoce literalmente cada disparador editorial en español e inglés', () => {
    for (const rule of MEDIA_TOPIC_CLASSIFICATION_RULES) {
      for (const trigger of rule.triggers) {
        expect(classifier.classify({ title: trigger })).toContain(rule.qcode);
      }
    }
  });

  it('aplica cada exclusión solamente a la categoría de su regla', () => {
    for (const rule of MEDIA_TOPIC_CLASSIFICATION_RULES) {
      for (const exclusion of rule.exclusions) {
        expect(classifier.classify({ title: exclusion })).not.toContain(rule.qcode);
      }
    }
  });

  it('normaliza mayúsculas, diacríticos, puntuación y HTML', () => {
    expect(classifier.classify({ title: '<p>TECNOLOGIA, MÉDICA</p>' })).toEqual([
      'medtop:07000000',
      'medtop:13000000',
    ]);
  });

  it('exige tokens completos y no encuentra disparadores dentro de otras palabras', () => {
    expect(classifier.classify({ title: 'rainbow fair' })).toEqual([]);
  });

  it('clasifica título y descripción por separado y une resultados en orden oficial', () => {
    expect(
      classifier.classify({ title: 'Torneo de tenis', description: 'Nueva vacuna' }),
    ).toEqual(['medtop:07000000', 'medtop:15000000']);
  });

  it('no forma una frase cruzando el límite entre título y descripción', () => {
    expect(classifier.classify({ title: 'banco', description: 'central' })).toEqual([]);
  });

  it('una exclusión anula solo la ocurrencia contenida y conserva otro disparador válido', () => {
    expect(
      classifier.classify({ title: 'The medical drama presented a medical treatment' }),
    ).toContain('medtop:07000000');
  });

  it('no duplica categorías aunque coincidan varios términos en ambos campos', () => {
    expect(
      classifier.classify({ title: 'hospital y vacuna', description: 'public health hospital' }),
    ).toEqual(['medtop:07000000']);
  });

  it('produce el mismo resultado ordenado para la misma entrada', () => {
    const input = {
      title: 'Gobierno anuncia una vacuna y una misión espacial',
      description: 'El parlamento debate salud y tecnología',
    };
    const expected = ['medtop:07000000', 'medtop:11000000', 'medtop:13000000'];

    expect(classifier.classify(input)).toEqual(expected);
    expect(classifier.classify(input)).toEqual(expected);
  });

  it('devuelve lista vacía para valores nulos, vacíos o sin coincidencias', () => {
    expect(classifier.classify({ title: null, description: undefined })).toEqual([]);
    expect(classifier.classify({ title: '   ', description: 'contenido neutral' })).toEqual([]);
  });
});
