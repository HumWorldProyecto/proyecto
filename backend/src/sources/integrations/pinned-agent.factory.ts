import { Injectable } from '@nestjs/common';
import * as http from 'node:http';
import * as https from 'node:https';
import { LookupFunction } from 'node:net';
import { ResolvedDestination } from '../security/source-destination-resolver';

function comparableHostname(hostname: string): string {
  const unwrapped = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
  return (unwrapped.endsWith('.') ? unwrapped.slice(0, -1) : unwrapped).toLowerCase();
}

export function createPinnedLookup(destination: ResolvedDestination): LookupFunction {
  return (requestedHostname, options, callback): void => {
    if (comparableHostname(requestedHostname) !== comparableHostname(destination.hostname)) {
      const error = new Error('El Agent recibió un hostname inesperado') as NodeJS.ErrnoException;
      error.code = 'ERR_PINNED_HOSTNAME_MISMATCH';
      callback(error, '', destination.family);
      return;
    }

    if (options.all) {
      callback(null, [{ address: destination.address, family: destination.family }]);
      return;
    }

    callback(null, destination.address, destination.family);
  };
}

export type PinnedAgent = http.Agent | https.Agent;

export type PinnedAgentHandle = Readonly<{
  agent: PinnedAgent;
  protocol: 'http:' | 'https:';
  destroy: () => void;
}>;

@Injectable()
export class PinnedAgentFactory {
  create(url: URL, destination: ResolvedDestination): PinnedAgentHandle {
    const lookup = createPinnedLookup(destination);
    let agent: PinnedAgent;

    if (url.protocol === 'http:') {
      agent = new http.Agent({ keepAlive: false, lookup });
    } else if (url.protocol === 'https:') {
      agent = new https.Agent({ keepAlive: false, lookup });
    } else {
      throw new Error('Protocolo no admitido para el Agent fijado');
    }

    return {
      agent,
      protocol: url.protocol,
      destroy: () => agent.destroy(),
    };
  }
}
