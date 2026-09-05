import { PeriodicityState } from '../domain/periodicity';

export interface PeriodicityProviderPort {
  getCurrentState(): Promise<PeriodicityState>;
}

export const PERIODICITY_PROVIDER_PORT = Symbol('PERIODICITY_PROVIDER_PORT');
