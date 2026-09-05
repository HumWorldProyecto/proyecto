import { Inject, Injectable } from '@nestjs/common';
import { isIP } from 'node:net';
import { DeadlineExceededError, RequestDeadline } from '../../rss-http/request-deadline';
import { SourceAccessibilityError } from '../errors/source-accessibility.error';
import {
  DNS_RESOLVER,
  DnsResolver,
  ResolvedAddress,
} from '../integrations/dns-resolver';
import { PublicIpPolicy, addressWithoutIpv6Brackets } from './ip-address-policy';

export type ResolvedDestination = Readonly<{
  hostname: string;
  address: string;
  family: 4 | 6;
}>;

@Injectable()
export class SourceDestinationResolver {
  constructor(
    @Inject(DNS_RESOLVER) private readonly dnsResolver: DnsResolver,
    private readonly ipPolicy: PublicIpPolicy,
  ) {}

  async resolve(url: URL, deadline: RequestDeadline): Promise<ResolvedDestination> {
    const hostname = addressWithoutIpv6Brackets(url.hostname);
    const literalFamily = isIP(hostname);

    if (literalFamily === 4 || literalFamily === 6) {
      try {
        deadline.remainingOrThrow();
      } catch (error) {
        if (error instanceof DeadlineExceededError) {
          throw new SourceAccessibilityError('TIMEOUT', 'La verificación de la fuente expiró');
        }
        throw error;
      }
      this.assertAllowed(hostname);
      return { hostname, address: hostname, family: literalFamily };
    }

    let snapshot: readonly ResolvedAddress[];
    try {
      snapshot = await deadline.run(() => this.dnsResolver.lookupAll(hostname));
    } catch (error) {
      if (error instanceof DeadlineExceededError) {
        throw new SourceAccessibilityError('TIMEOUT', 'La verificación de la fuente expiró');
      }
      throw new SourceAccessibilityError('DNS', 'No se pudo resolver el destino de la fuente', error);
    }

    if (snapshot.length === 0) {
      throw new SourceAccessibilityError('DNS', 'El destino de la fuente no tiene direcciones');
    }

    for (const result of snapshot) {
      const address = addressWithoutIpv6Brackets(result.address);
      if (isIP(address) !== result.family) {
        throw new SourceAccessibilityError('DNS', 'La resolución produjo una dirección inválida');
      }
      this.assertAllowed(address);
    }

    const selected = snapshot[0];
    return {
      hostname,
      address: addressWithoutIpv6Brackets(selected.address),
      family: selected.family,
    };
  }

  private assertAllowed(address: string): void {
    if (!this.ipPolicy.isAllowed(address)) {
      throw new SourceAccessibilityError(
        'FORBIDDEN_DESTINATION',
        'El destino de la fuente no está permitido',
      );
    }
  }
}
