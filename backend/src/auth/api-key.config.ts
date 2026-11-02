import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

export type ApiKeyPermission = 'read' | 'write';
const digest = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest();

@Injectable()
export class ApiKeyConfig {
  readonly #readDigest: Buffer;
  readonly #writeDigest: Buffer;

  constructor(config: ConfigService) {
    const read = config.get<unknown>('HUMWORLD_API_KEY_READ');
    const write = config.get<unknown>('HUMWORLD_API_KEY_WRITE');
    if (typeof read !== 'string' || typeof write !== 'string' || !read.trim() || !write.trim()) {
      throw new Error('Configuración de acceso inválida');
    }
    this.#readDigest = digest(read);
    this.#writeDigest = digest(write);
    if (timingSafeEqual(this.#readDigest, this.#writeDigest)) {
      throw new Error('Configuración de acceso inválida');
    }
  }

  authenticate(input: unknown): ApiKeyPermission {
    if (typeof input !== 'string' || !input.trim()) {
      throw new UnauthorizedException('Clave de acceso ausente o inválida');
    }
    const candidate = digest(input);
    // Ambas comparaciones usan buffers de longitud fija y se ejecutan siempre.
    const read = timingSafeEqual(candidate, this.#readDigest);
    const write = timingSafeEqual(candidate, this.#writeDigest);
    if (write) return 'write';
    if (read) return 'read';
    throw new UnauthorizedException('Clave de acceso ausente o inválida');
  }
}
