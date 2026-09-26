export class MultipleSourceCaptureInputError extends Error {
  constructor() {
    super('Se requieren al menos dos identificadores de fuente efectivos');
    this.name = 'MultipleSourceCaptureInputError';
  }
}
