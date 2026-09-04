import { Injectable } from '@nestjs/common';
import { BlockList, isIP } from 'node:net';

type IpFamily = 'ipv4' | 'ipv6';
type Subnet = Readonly<{ network: string; prefix: number }>;

/**
 * Política revisada el 2026-09-04 contra los registros IANA de direcciones
 * especiales, cuya revisión publicada era 2025-10-09:
 * https://www.iana.org/assignments/iana-ipv4-special-registry
 * https://www.iana.org/assignments/iana-ipv6-special-registry
 */
export const IP_POLICY_REVISION = '2026-09-04';

export const BLOCKED_IPV4_SUBNETS: readonly Subnet[] = [
  { network: '0.0.0.0', prefix: 8 },
  { network: '10.0.0.0', prefix: 8 },
  { network: '100.64.0.0', prefix: 10 },
  { network: '127.0.0.0', prefix: 8 },
  { network: '169.254.0.0', prefix: 16 },
  { network: '172.16.0.0', prefix: 12 },
  { network: '192.0.0.0', prefix: 24 },
  { network: '192.0.2.0', prefix: 24 },
  { network: '192.31.196.0', prefix: 24 },
  { network: '192.52.193.0', prefix: 24 },
  { network: '192.88.99.0', prefix: 24 },
  { network: '192.168.0.0', prefix: 16 },
  { network: '192.175.48.0', prefix: 24 },
  { network: '198.18.0.0', prefix: 15 },
  { network: '198.51.100.0', prefix: 24 },
  { network: '203.0.113.0', prefix: 24 },
  { network: '224.0.0.0', prefix: 4 },
  { network: '240.0.0.0', prefix: 4 },
];

export const BLOCKED_IPV6_SUBNETS: readonly Subnet[] = [
  { network: '::', prefix: 128 },
  { network: '::1', prefix: 128 },
  { network: '::ffff:0:0', prefix: 96 },
  { network: '64:ff9b::', prefix: 96 },
  { network: '64:ff9b:1::', prefix: 48 },
  { network: '100::', prefix: 64 },
  { network: '100:0:0:1::', prefix: 64 },
  { network: '2001::', prefix: 23 },
  { network: '2001:db8::', prefix: 32 },
  { network: '2002::', prefix: 16 },
  { network: '2620:4f:8000::', prefix: 48 },
  { network: '3fff::', prefix: 20 },
  { network: '5f00::', prefix: 16 },
  { network: 'fc00::', prefix: 7 },
  { network: 'fe80::', prefix: 10 },
  { network: 'fec0::', prefix: 10 },
  { network: 'ff00::', prefix: 8 },
];

function buildBlockList(subnets: readonly Subnet[], family: IpFamily): BlockList {
  const blockList = new BlockList();
  for (const subnet of subnets) {
    blockList.addSubnet(subnet.network, subnet.prefix, family);
  }
  return blockList;
}

const blockedIpv4 = buildBlockList(BLOCKED_IPV4_SUBNETS, 'ipv4');
const blockedIpv6 = buildBlockList(BLOCKED_IPV6_SUBNETS, 'ipv6');
const ordinaryGlobalIpv6 = buildBlockList([{ network: '2000::', prefix: 3 }], 'ipv6');

export function addressWithoutIpv6Brackets(address: string): string {
  if (address.startsWith('[') && address.endsWith(']')) {
    return address.slice(1, -1);
  }
  return address;
}

@Injectable()
export class PublicIpPolicy {
  isAllowed(address: string): boolean {
    const normalized = addressWithoutIpv6Brackets(address);
    const family = isIP(normalized);

    if (family === 4) {
      return !blockedIpv4.check(normalized, 'ipv4');
    }

    if (family === 6) {
      return (
        ordinaryGlobalIpv6.check(normalized, 'ipv6') &&
        !blockedIpv6.check(normalized, 'ipv6')
      );
    }

    return false;
  }
}
