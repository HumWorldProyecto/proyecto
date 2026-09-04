import { Injectable } from '@nestjs/common';
import { promises as dns } from 'node:dns';

export type ResolvedAddress = Readonly<{
  address: string;
  family: 4 | 6;
}>;

export interface DnsResolver {
  lookupAll(hostname: string): Promise<readonly ResolvedAddress[]>;
}

export const DNS_RESOLVER = Symbol('DNS_RESOLVER');

@Injectable()
export class NodeDnsResolver implements DnsResolver {
  async lookupAll(hostname: string): Promise<readonly ResolvedAddress[]> {
    const results = await dns.lookup(hostname, { all: true, order: 'verbatim' });
    return results.map(({ address, family }) => {
      if (family !== 4 && family !== 6) {
        throw new Error('La resolución DNS devolvió una familia no admitida');
      }
      return { address, family };
    });
  }
}
