export class PeriodicityInputError extends Error {
  constructor() {
    super('La periodicidad indicada no pertenece al catálogo permitido');
    this.name = 'PeriodicityInputError';
  }
}

export class PeriodicityConfigurationError extends Error {
  constructor(readonly originalValue: unknown) {
    super('La periodicidad almacenada es inconsistente');
    this.name = 'PeriodicityConfigurationError';
  }
}
