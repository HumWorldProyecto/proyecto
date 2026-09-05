import { Injectable } from '@nestjs/common';
import { SourceAccessibilityError } from '../errors/source-accessibility.error';

function hostnameForPolicy(hostname: string): string {
  const withoutTrailingDot = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
  return withoutTrailingDot.toLowerCase();
}

@Injectable()
export class SourceUrlNormalizer {
  normalize(rawUrl: string): URL {
    let url: URL;

    try {
      url = new URL(rawUrl.trim());
    } catch (error) {
      throw new SourceAccessibilityError('INPUT', 'La URL de la fuente no es válida', error);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new SourceAccessibilityError('INPUT', 'La URL debe usar HTTP o HTTPS');
    }

    if (!url.hostname) {
      throw new SourceAccessibilityError('INPUT', 'La URL debe incluir un hostname');
    }

    if (url.username || url.password) {
      throw new SourceAccessibilityError('INPUT', 'La URL no puede contener credenciales');
    }

    const hostname = hostnameForPolicy(url.hostname);
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      throw new SourceAccessibilityError(
        'FORBIDDEN_DESTINATION',
        'El destino de la fuente no está permitido',
      );
    }

    return new URL(url.toString());
  }
}
