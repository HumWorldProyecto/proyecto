import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  DeadlineExceededError,
  RequestDeadline,
} from '../../rss-http/request-deadline';
import { RSS_FETCH_TIMEOUT_MS } from '../../rss-http/rss-http-timeout';
import { SourceUrlNormalizer } from '../../sources/domain/source-url-normalizer';
import { SourceAccessibilityError } from '../../sources/errors/source-accessibility.error';
import { PinnedAgentFactory } from '../../sources/integrations/pinned-agent.factory';
import {
  getRedirectLocation,
  MAX_SAFE_HTTP_REDIRECTS,
  redirectVisitKey,
  SAFE_HTTP_REDIRECT_STATUSES,
} from '../../sources/security/http-redirect-policy';
import { SourceDestinationResolver } from '../../sources/security/source-destination-resolver';
import { RssFetcherPort } from '../ports/rss-fetcher.port';
import { RssFetchError } from '../errors/rss-fetch.error';

@Injectable()
export class HttpRssFetcher implements RssFetcherPort {
  constructor(
    private readonly httpService: HttpService,
    private readonly normalizer: SourceUrlNormalizer,
    private readonly destinationResolver: SourceDestinationResolver,
    private readonly agentFactory: PinnedAgentFactory,
    @Inject(RSS_FETCH_TIMEOUT_MS) private readonly timeoutMs: number,
  ) {}

  async fetchRaw(url: string): Promise<string> {
    const deadline = new RequestDeadline(this.timeoutMs);

    try {
      return await this.followRedirects(this.normalizer.normalize(url), deadline);
    } catch (error) {
      if (error instanceof RssFetchError) {
        throw error;
      }
      throw new RssFetchError('No se pudo obtener la fuente RSS', error);
    } finally {
      deadline.dispose();
    }
  }

  private async followRedirects(
    initialUrl: URL,
    deadline: RequestDeadline,
  ): Promise<string> {
    const visited = new Set<string>();
    let currentUrl = initialUrl;
    let redirectsFollowed = 0;

    while (true) {
      const currentKey = redirectVisitKey(currentUrl);
      if (visited.has(currentKey)) {
        throw new RssFetchError('La fuente RSS contiene un ciclo de redirección');
      }
      visited.add(currentKey);

      const destination = await this.destinationResolver.resolve(currentUrl, deadline);
      const agentHandle = this.agentFactory.create(currentUrl, destination);

      let status: number;
      let headers: Record<string, unknown>;
      let body: unknown;
      try {
        const config: AxiosRequestConfig = {
          proxy: false,
          maxRedirects: 0,
          responseType: 'text',
          responseEncoding: 'utf8',
          timeout: deadline.remainingOrThrow(),
          signal: deadline.signal,
          validateStatus: () => true,
          ...(agentHandle.protocol === 'http:'
            ? { httpAgent: agentHandle.agent }
            : { httpsAgent: agentHandle.agent }),
        };

        const response = await deadline.run(() =>
          firstValueFrom(this.httpService.get<string>(currentUrl.toString(), config)),
        );
        status = response.status;
        headers = response.headers as Record<string, unknown>;
        body = response.data;
      } catch (error) {
        throw this.translateTransportError(error, deadline);
      } finally {
        agentHandle.destroy();
      }

      if (status >= 200 && status < 300) {
        if (typeof body !== 'string') {
          throw new RssFetchError('La fuente RSS no devolvió contenido de texto');
        }
        return body;
      }

      if (!SAFE_HTTP_REDIRECT_STATUSES.has(status)) {
        throw new RssFetchError('La fuente RSS no respondió con un estado HTTP satisfactorio');
      }

      if (redirectsFollowed >= MAX_SAFE_HTTP_REDIRECTS) {
        throw new RssFetchError('La fuente RSS excedió el máximo de redirecciones');
      }

      const location = getRedirectLocation(headers);
      if (!location) {
        throw new RssFetchError('La redirección RSS no contiene un destino válido');
      }

      currentUrl = this.normalizeRedirect(location, currentUrl);
      redirectsFollowed += 1;
    }
  }

  private normalizeRedirect(location: string, currentUrl: URL): URL {
    try {
      return this.normalizer.normalize(new URL(location, currentUrl).toString());
    } catch (error) {
      throw new RssFetchError('La redirección RSS no es válida', error);
    }
  }

  private translateTransportError(error: unknown, deadline: RequestDeadline): RssFetchError {
    if (error instanceof RssFetchError) {
      return error;
    }

    if (
      error instanceof DeadlineExceededError ||
      deadline.expired ||
      (error instanceof AxiosError &&
        ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(error.code ?? ''))
    ) {
      return new RssFetchError('La descarga de la fuente RSS expiró', error);
    }

    if (error instanceof SourceAccessibilityError) {
      return new RssFetchError('El destino de la fuente RSS no está permitido o disponible', error);
    }

    return new RssFetchError('No se pudo descargar la fuente RSS', error);
  }
}
