export type EligibleSource = Readonly<{
  id: string;
  url: string;
}>;

export type CaptureSourceSelection =
  | Readonly<{ kind: 'missing' }>
  | Readonly<{ kind: 'inactive'; sourceId: string }>
  | Readonly<{ kind: 'eligible'; source: EligibleSource }>;

export interface SourceRegistryPort {
  getEligibleSources(): Promise<readonly EligibleSource[]>;
  findForCapture(sourceId: string): Promise<CaptureSourceSelection>;
}

export const SOURCE_REGISTRY_PORT = Symbol('SOURCE_REGISTRY_PORT');
