export class SourceNotFoundError extends Error {
  constructor() {
    super('La fuente RSS no existe');
    this.name = 'SourceNotFoundError';
  }
}

export class SourceUrlConflictError extends Error {
  constructor() {
    super('Ya existe una fuente RSS con la misma URL');
    this.name = 'SourceUrlConflictError';
  }
}

export class SourceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceInputError';
  }
}
