import { RssSource } from '../types/rss-source';

/**
 * Límite abstracto hacia el registro de fuentes RSS administrado por HU-15.
 * HU-01 no define este contrato interno definitivo ni las reglas de gestión de HU-15.
 */
export interface SourceRegistryPort {
  getRegisteredSources(): Promise<RssSource[]>;
}

export const SOURCE_REGISTRY_PORT = Symbol('SOURCE_REGISTRY_PORT');
