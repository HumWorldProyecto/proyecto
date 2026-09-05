import {
  ALLOWED_PERIODICITY_MINUTES,
  configuredPeriodicity,
  isAllowedPeriodicityMinutes,
  requireAllowedPeriodicityMinutes,
  unconfiguredPeriodicity,
} from '../../src/capture-config/domain/periodicity';
import { PeriodicityInputError } from '../../src/capture-config/errors/periodicity.error';

describe('catálogo de periodicidad', () => {
  it.each(ALLOWED_PERIODICITY_MINUTES)('acepta %s minutos', (value) => {
    expect(isAllowedPeriodicityMinutes(value)).toBe(true);
    expect(requireAllowedPeriodicityMinutes(value)).toBe(value);
    expect(configuredPeriodicity(value)).toEqual({ kind: 'configured', minutes: value });
  });

  it.each([undefined, null, '30', true, false, 0, 14, 30.5, 31, 1450, NaN, Infinity])(
    'rechaza estrictamente %p',
    (value) => {
      expect(isAllowedPeriodicityMinutes(value)).toBe(false);
      expect(() => requireAllowedPeriodicityMinutes(value)).toThrow(PeriodicityInputError);
    },
  );

  it('representa explícitamente el estado sin configurar', () => {
    expect(unconfiguredPeriodicity()).toEqual({ kind: 'unconfigured' });
  });
});
