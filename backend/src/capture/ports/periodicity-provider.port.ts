/**
 * Límite abstracto hacia la periodicidad administrada por HU-18.
 * HU-01 no define este contrato interno definitivo ni la gestión de periodicidad de HU-18.
 */
export interface PeriodicityProviderPort {
  getPeriodicityMs(): Promise<number>;
}

export const PERIODICITY_PROVIDER_PORT = Symbol('PERIODICITY_PROVIDER_PORT');
