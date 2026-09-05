import {
  IP_POLICY_REVISION,
  PublicIpPolicy,
  addressWithoutIpv6Brackets,
} from '../../src/sources/security/ip-address-policy';

describe('PublicIpPolicy', () => {
  const policy = new PublicIpPolicy();

  it('mantiene una revisión explícita de la política', () => {
    expect(IP_POLICY_REVISION).toBe('2026-09-04');
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.15.255.255', '172.32.0.0'])(
    'permite IPv4 pública ordinaria %p',
    (address) => expect(policy.isAllowed(address)).toBe(true),
  );

  it.each([
    '0.0.0.1',
    '10.1.2.3',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.1.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.0.1',
    '192.0.2.1',
    '192.88.99.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '255.255.255.255',
  ])('bloquea IPv4 no pública o especial %p', (address) => {
    expect(policy.isAllowed(address)).toBe(false);
  });

  it.each(['2606:4700:4700::1111', '[2001:4860:4860::8888]'])(
    'permite IPv6 unicast global ordinaria %p',
    (address) => expect(policy.isAllowed(address)).toBe(true),
  );

  it.each([
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '64:ff9b::7f00:1',
    '100::1',
    '2001::1',
    '2001:db8::1',
    '2002::1',
    '3fff::1',
    '5f00::1',
    'fc00::1',
    'fd00::1',
    'fe80::1',
    'fec0::1',
    'ff02::1',
  ])('bloquea IPv6 no pública o especial %p', (address) => {
    expect(policy.isAllowed(address)).toBe(false);
  });

  it('rechaza valores que no son direcciones IP', () => {
    expect(policy.isAllowed('example.com')).toBe(false);
  });

  it('retira únicamente los corchetes de un literal IPv6', () => {
    expect(addressWithoutIpv6Brackets('[::1]')).toBe('::1');
    expect(addressWithoutIpv6Brackets('8.8.8.8')).toBe('8.8.8.8');
  });
});
