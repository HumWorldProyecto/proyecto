export class DictionaryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DictionaryInputError';
  }
}

export class DictionaryEntryNotFoundError extends Error {
  constructor() {
    super('La entrada del diccionario no existe');
    this.name = 'DictionaryEntryNotFoundError';
  }
}

export class DictionaryEntryConflictError extends Error {
  constructor() {
    super('Ya existe el término para ese idioma');
    this.name = 'DictionaryEntryConflictError';
  }
}
