import { promises as dns } from 'node:dns';
import { RequestDeadline } from '../../src/rss-http/request-deadline';
import { SourceAccessibilityError } from '../../src/sources/errors/source-accessibility.error';
import {
  DnsResolver,
  NodeDnsResolver,
} from '../../src/sources/integrations/dns-resolver';
import { PublicIpPolicy } from '../../src/sources/security/ip-address-policy';
import { SourceDestinationResolver } from '../../src/sources/security/source-destination-resolver';

describe('NodeDnsResolver', () => {
  afterEach(() => jest.restoreAllMocks());

  it('usa lookup con todas las respuestas y orden verbatim', async () => {
    const lookup = jest
      .spyOn(dns, 'lookup')
      .mockResolvedValue([{ address: '8.8.8.8', family: 4 }] as never);

    await expect(new NodeDnsResolver().lookupAll('example.com')).resolves.toEqual([
      { address: '8.8.8.8', family: 4 },
    ]);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith('example.com', { all: true, order: 'verbatim' });
  });

  it('rechaza una familia DNS distinta de IPv4 o IPv6', async () => {
    jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '8.8.8.8', family: 0 }] as never);

    await expect(new NodeDnsResolver().lookupAll('example.com')).rejects.toThrow(
      'familia no admitida',
    );
  });
});

describe('SourceDestinationResolver', () => {
  const dnsResolver: jest.Mocked<DnsResolver> = { lookupAll: jest.fn() };
  const resolver = new SourceDestinationResolver(dnsResolver, new PublicIpPolicy());
  const deadlines: RequestDeadline[] = [];

  function deadline(timeout = 1_000): RequestDeadline {
    const value = new RequestDeadline(timeout);
    deadlines.push(value);
    return value;
  }

  afterEach(() => {
    deadlines.splice(0).forEach((value) => value.dispose());
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('valida una IPv4 literal pública sin hacer DNS', async () => {
    await expect(resolver.resolve(new URL('https://8.8.8.8/feed'), deadline())).resolves.toEqual({
      hostname: '8.8.8.8',
      address: '8.8.8.8',
      family: 4,
    });
    expect(dnsResolver.lookupAll).not.toHaveBeenCalled();
  });

  it('normaliza y valida una IPv6 literal pública sin hacer DNS', async () => {
    await expect(
      resolver.resolve(new URL('https://[2606:4700:4700::1111]/feed'), deadline()),
    ).resolves.toEqual({
      hostname: '2606:4700:4700::1111',
      address: '2606:4700:4700::1111',
      family: 6,
    });
    expect(dnsResolver.lookupAll).not.toHaveBeenCalled();
  });

  it('rechaza una IP literal privada sin hacer DNS', async () => {
    const result = resolver.resolve(new URL('http://10.0.0.1/feed'), deadline());

    await expectErrorCode(result, 'FORBIDDEN_DESTINATION');
    expect(dnsResolver.lookupAll).not.toHaveBeenCalled();
  });

  it('traduce el deadline vencido antes de procesar una IP literal', async () => {
    let now = 0;
    const expiredDeadline = new RequestDeadline(100, () => now);
    deadlines.push(expiredDeadline);
    now = 101;

    await expectErrorCode(
      resolver.resolve(new URL('https://8.8.8.8/feed'), expiredDeadline),
      'TIMEOUT',
    );
    expect(dnsResolver.lookupAll).not.toHaveBeenCalled();
  });

  it('selecciona determinísticamente la primera de varias IP públicas', async () => {
    dnsResolver.lookupAll.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 },
    ]);

    await expect(resolver.resolve(new URL('https://example.com/feed'), deadline())).resolves.toEqual(
      {
        hostname: 'example.com',
        address: '8.8.8.8',
        family: 4,
      },
    );
    expect(dnsResolver.lookupAll).toHaveBeenCalledTimes(1);
  });

  it('rechaza una resolución privada', async () => {
    dnsResolver.lookupAll.mockResolvedValue([{ address: '192.168.1.2', family: 4 }]);

    await expectErrorCode(
      resolver.resolve(new URL('https://example.com/feed'), deadline()),
      'FORBIDDEN_DESTINATION',
    );
  });

  it('rechaza completamente una resolución mixta', async () => {
    dnsResolver.lookupAll.mockResolvedValue([
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);

    await expectErrorCode(
      resolver.resolve(new URL('https://example.com/feed'), deadline()),
      'FORBIDDEN_DESTINATION',
    );
    expect(dnsResolver.lookupAll).toHaveBeenCalledTimes(1);
  });

  it('rechaza una resolución sin direcciones', async () => {
    dnsResolver.lookupAll.mockResolvedValue([]);

    await expectErrorCode(resolver.resolve(new URL('https://example.com'), deadline()), 'DNS');
  });

  it('traduce un fallo del resolver', async () => {
    dnsResolver.lookupAll.mockRejectedValue(new Error('fallo interno del resolver'));

    const result = resolver.resolve(new URL('https://example.com'), deadline());
    await expectErrorCode(result, 'DNS');
    await expect(result).rejects.not.toThrow('fallo interno del resolver');
  });

  it('rechaza una dirección cuya family no coincide', async () => {
    dnsResolver.lookupAll.mockResolvedValue([{ address: '8.8.8.8', family: 6 }]);

    await expectErrorCode(resolver.resolve(new URL('https://example.com'), deadline()), 'DNS');
  });

  it('agota el deadline durante DNS e ignora una resolución posterior', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    let finishLookup!: () => void;
    dnsResolver.lookupAll.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishLookup = () => resolve([{ address: '8.8.8.8', family: 4 }]);
        }),
    );
    const result = resolver.resolve(new URL('https://example.com'), deadline(100));
    const expectation = expectErrorCode(result, 'TIMEOUT');

    await jest.advanceTimersByTimeAsync(100);
    await expectation;
    finishLookup();
    await Promise.resolve();
    expect(dnsResolver.lookupAll).toHaveBeenCalledTimes(1);
  });
});

async function expectErrorCode(
  result: Promise<unknown>,
  code: SourceAccessibilityError['code'],
): Promise<void> {
  try {
    await result;
    throw new Error('Se esperaba SourceAccessibilityError');
  } catch (error) {
    expect(error).toBeInstanceOf(SourceAccessibilityError);
    expect((error as SourceAccessibilityError).code).toBe(code);
  }
}
