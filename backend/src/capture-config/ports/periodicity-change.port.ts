import { PeriodicityState } from '../domain/periodicity';

export type PeriodicityChange = Readonly<{
  state: PeriodicityState;
  effectiveAt: Date;
}>;

export type PeriodicityChangeListener = (
  change: PeriodicityChange,
) => void | Promise<void>;

export interface PeriodicityChangeNotifierPort {
  subscribe(listener: PeriodicityChangeListener): () => void;
}

export interface PeriodicityChangePublisherPort {
  publish(change: PeriodicityChange): Promise<void>;
}

export const PERIODICITY_CHANGE_NOTIFIER_PORT = Symbol(
  'PERIODICITY_CHANGE_NOTIFIER_PORT',
);

// Este token es deliberadamente interno a CaptureConfigModule.
export const PERIODICITY_CHANGE_PUBLISHER_PORT = Symbol(
  'PERIODICITY_CHANGE_PUBLISHER_PORT',
);
