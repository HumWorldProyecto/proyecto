/**
 * Límite abstracto de disparo automático. Integra la periodicidad de HU-18 con
 * la orquestación de captura sin comprometer una tecnología concreta de scheduling.
 */
export interface CaptureTriggerPort {
  start(onTrigger: () => Promise<void> | void): void;
  stop(): void;
}

export const CAPTURE_TRIGGER_PORT = Symbol('CAPTURE_TRIGGER_PORT');
