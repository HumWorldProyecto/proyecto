export class SentimentDictionaryReadError extends Error {
  constructor() {
    super('No fue posible leer el diccionario de sentimiento');
    this.name = 'SentimentDictionaryReadError';
  }
}

export class NewsForSentimentNotFoundError extends Error {
  constructor() {
    super('La noticia no existe');
    this.name = 'NewsForSentimentNotFoundError';
  }
}

export class NewsForSentimentReadError extends Error {
  constructor() {
    super('No fue posible leer la noticia');
    this.name = 'NewsForSentimentReadError';
  }
}
