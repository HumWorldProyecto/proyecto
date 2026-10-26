import catalog from './countries.json';
import { Country } from '../types/analytics';

export const COUNTRIES: readonly Country[] = Object.freeze(
  catalog.map((country) => Object.freeze(country as Country)),
);
export const COUNTRY_BY_CODE: ReadonlyMap<string, Country> = new Map(
  COUNTRIES.map((country) => [country.code, country]),
);
