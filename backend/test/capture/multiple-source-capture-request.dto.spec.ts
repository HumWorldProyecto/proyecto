import { validate } from 'class-validator';
import { MultipleSourceCaptureRequestDto } from '../../src/capture/dto/multiple-source-capture-request.dto';

function requestDto(sourceIds?: unknown): MultipleSourceCaptureRequestDto {
  return Object.assign(new MultipleSourceCaptureRequestDto(), { sourceIds });
}

describe('MultipleSourceCaptureRequestDto', () => {
  it('acepta un array de strings no vacíos sin imponer un máximo', async () => {
    const sourceIds = Array.from({ length: 25 }, (_, index) => `source-${index}`);

    await expect(validate(requestDto(sourceIds))).resolves.toEqual([]);
  });

  it.each([
    undefined,
    'source-a',
    [1, 'source-b'],
    ['', 'source-b'],
  ])('rechaza la estructura inválida %j', async (sourceIds) => {
    await expect(validate(requestDto(sourceIds))).resolves.not.toHaveLength(0);
  });

  it('deja la cardinalidad efectiva al servicio batch', async () => {
    await expect(validate(requestDto(['source-a', 'source-a']))).resolves.toEqual(
      [],
    );
  });
});
