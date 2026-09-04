import * as http from 'node:http';
import * as https from 'node:https';
import { LookupFunction } from 'node:net';
import {
  PinnedAgentFactory,
  createPinnedLookup,
} from '../../src/sources/integrations/pinned-agent.factory';
import { ResolvedDestination } from '../../src/sources/security/source-destination-resolver';

describe('PinnedAgentFactory', () => {
  const factory = new PinnedAgentFactory();
  const destination: ResolvedDestination = {
    hostname: 'example.com',
    address: '8.8.8.8',
    family: 4,
  };

  it('crea un http.Agent efímero sin keep-alive', () => {
    const handle = factory.create(new URL('http://example.com:8080/feed'), destination);

    expect(handle.agent).toBeInstanceOf(http.Agent);
    expect(handle.protocol).toBe('http:');
    expect(agentOptions(handle.agent).keepAlive).toBe(false);
    const destroy = jest.spyOn(handle.agent, 'destroy');
    handle.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('crea un https.Agent conservando el hostname de la URL', () => {
    const url = new URL('https://example.com:8443/feed');
    const handle = factory.create(url, destination);

    expect(handle.agent).toBeInstanceOf(https.Agent);
    expect(handle.protocol).toBe('https:');
    expect(agentOptions(handle.agent).keepAlive).toBe(false);
    expect(agentOptions(handle.agent).servername).toBeUndefined();
    expect(url.hostname).toBe('example.com');
    handle.destroy();
  });

  it('rechaza un protocolo no admitido', () => {
    expect(() => factory.create(new URL('ftp://example.com/feed'), destination)).toThrow(
      'Protocolo no admitido',
    );
  });

});

describe('createPinnedLookup', () => {
  const destination: ResolvedDestination = {
    hostname: 'Example.COM.',
    address: '2606:4700:4700::1111',
    family: 6,
  };

  it('devuelve solo la IP elegida y su family sin resolver nuevamente', async () => {
    const lookup = createPinnedLookup(destination);

    await expect(invokeLookup(lookup, 'example.com', false)).resolves.toEqual({
      address: destination.address,
      family: 6,
    });
  });

  it('respeta options.all sin añadir otras direcciones', async () => {
    const lookup = createPinnedLookup(destination);

    await expect(invokeLookup(lookup, 'EXAMPLE.COM.', true)).resolves.toEqual([
      { address: destination.address, family: 6 },
    ]);
  });

  it('rechaza un hostname distinto del validado', async () => {
    const lookup = createPinnedLookup(destination);

    await expect(invokeLookup(lookup, 'attacker.example', false)).rejects.toMatchObject({
      code: 'ERR_PINNED_HOSTNAME_MISMATCH',
    });
  });
});

function invokeLookup(
  lookup: LookupFunction,
  hostname: string,
  all: boolean,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    lookup(hostname, { all }, (error, address, family) => {
      if (error) {
        reject(error);
        return;
      }
      if (Array.isArray(address)) {
        resolve(address);
        return;
      }
      resolve({ address, family });
    });
  });
}

function agentOptions(agent: unknown): { keepAlive?: boolean; servername?: string } {
  return (agent as { options: { keepAlive?: boolean; servername?: string } }).options;
}
