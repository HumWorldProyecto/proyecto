import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { Readable } from 'node:stream';
import { firstValueFrom } from 'rxjs';
import {
  DeadlineExceededError,
  RequestDeadline,
} from '../../rss-http/request-deadline';
import { RSS_FETCH_TIMEOUT_MS } from '../../rss-http/rss-http-timeout';
import { SourceUrlNormalizer } from '../domain/source-url-normalizer';
import { SourceAccessibilityError } from '../errors/source-accessibility.error';
import { PinnedAgentFactory } from './pinned-agent.factory';
import { SourceDestinationResolver } from '../security/source-destination-resolver';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
export const MAX_SOURCE_REDIRECTS = 3;

function effectiveUrlKey(url: URL): string {
  const effective = new URL(url.toString());
  effective.hash = '';
  return effective.toString();
}

function locationHeader(headers: Record<string, unknown>): string | undefined {
  const location = headers.location;
  return typeof location === 'string' && location.trim().length > 0 ? location : undefined;
}

@Injectable()
export class SourceAccessibilityChecker {
  constructor(
    private readonly httpService: HttpService,
    private readonly normalizer: SourceUrlNormalizer,
    private readonly destinationResolver: SourceDestinationResolver,
    private readonly agentFactory: PinnedAgentFactory,
    @Inject(RSS_FETCH_TIMEOUT_MS) private readonly timeoutMs: number,
  ) {}

  async assertAccessible(rawUrl: string): Promise<string> {
    const initialUrl = this.normalizer.normalize(rawUrl);
    const deadline = new RequestDeadline(this.timeoutMs);

    try {
      await this.followUntilAccessible(initialUrl, deadline);
      return initialUrl.toString();
    } finally {
      deadline.dispose();
    }
  }

  private async followUntilAccessible(
    initialUrl: URL,
    deadline: RequestDeadline,
  ): Promise<void> {
    const visited = new Set<string>();
    let currentUrl = initialUrl;
    let redirectsFollowed = 0;

    while (true) {
      const currentKey = effectiveUrlKey(currentUrl);
      if (visited.has(currentKey)) {
        throw new SourceAccessibilityError('REDIRECT', 'La redirección contiene un ciclo');
      }
      visited.add(currentKey);

      const destination = await this.destinationResolver.resolve(currentUrl, deadline);
      const agentHandle = this.agentFactory.create(currentUrl, destination);

      let status: number;
      let headers: Record<string, unknown>;
      try {
        const config: AxiosRequestConfig = {
          proxy: false,
          maxRedirects: 0,
          responseType: 'stream',
          timeout: deadline.remainingOrThrow(),
          signal: deadline.signal,
          validateStatus: () => true,
          ...(agentHandle.protocol === 'http:'
            ? { httpAgent: agentHandle.agent }
            : { httpsAgent: agentHandle.agent }),
        };

        const response = await deadline.run(() =>
          firstValueFrom(this.httpService.get<Readable>(currentUrl.toString(), config)),
        );
        status = response.status;
        headers = response.headers as Record<string, unknown>;
        response.data.destroy();
      } catch (error) {
        throw this.translateTransportError(error, deadline);
      } finally {
        agentHandle.destroy();
      }

      if (status >= 200 && status < 300) {
        return;
      }

      if (!REDIRECT_STATUSES.has(status)) {
        throw new SourceAccessibilityError(
          'HTTP_STATUS',
          'La fuente no respondió con un estado HTTP satisfactorio',
        );
      }

      if (redirectsFollowed >= MAX_SOURCE_REDIRECTS) {
        throw new SourceAccessibilityError(
          'REDIRECT',
          'La fuente excedió el máximo de redirecciones',
        );
      }

      const location = locationHeader(headers);
      if (!location) {
        throw new SourceAccessibilityError(
          'REDIRECT',
          'La respuesta de redirección no contiene un destino válido',
        );
      }

      currentUrl = this.normalizeRedirect(location, currentUrl);
      redirectsFollowed += 1;
    }
  }

  private normalizeRedirect(location: string, currentUrl: URL): URL {
    try {
      return this.normalizer.normalize(new URL(location, currentUrl).toString());
    } catch (error) {
      if (
        error instanceof SourceAccessibilityError &&
        error.code === 'FORBIDDEN_DESTINATION'
      ) {
        throw error;
      }
      throw new SourceAccessibilityError('REDIRECT', 'La redirección no es válida', error);
    }
  }

  private translateTransportError(error: unknown, deadline: RequestDeadline): Error {
    if (error instanceof SourceAccessibilityError) {
      return error;
    }

    if (
      error instanceof DeadlineExceededError ||
      deadline.expired ||
      (error instanceof AxiosError &&
        ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(error.code ?? ''))
    ) {
      return new SourceAccessibilityError('TIMEOUT', 'La verificación de la fuente expiró');
    }

    return new SourceAccessibilityError(
      'NETWORK',
      'No se pudo acceder al destino de la fuente',
      error,
    );
  }
}
