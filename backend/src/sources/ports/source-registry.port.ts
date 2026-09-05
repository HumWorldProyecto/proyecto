export type EligibleSource = Readonly<{
  id: string;
  url: string;
}>;

export interface SourceRegistryPort {
  getEligibleSources(): Promise<readonly EligibleSource[]>;
}

export const SOURCE_REGISTRY_PORT = Symbol('SOURCE_REGISTRY_PORT');
