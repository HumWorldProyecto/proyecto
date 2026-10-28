import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { randomBytes } from 'node:crypto';
import { ApiKeyConfig } from '../../src/auth/api-key.config';
import { ApiKeyGuard } from '../../src/auth/api-key.guard';

const fresh = () => randomBytes(32).toString('hex');
function configured(read: unknown, write: unknown) {
  const values: Record<string, unknown> = { HUMWORLD_API_KEY_READ: read, HUMWORLD_API_KEY_WRITE: write };
  return new ApiKeyConfig({ get: (name: string) => values[name] } as ConfigService);
}

describe('P12 configuración y autenticación (unitarias)', () => {
  it.each(['read missing', 'write missing', 'read empty', 'write empty', 'read whitespace', 'write whitespace', 'equal', 'invalid type'])(
    'rechaza %s al construir la configuración sin revelar valores', (kind) => {
      // Arrange
      let read: unknown = fresh(); let write: unknown = fresh();
      if (kind === 'read missing') read = undefined;
      if (kind === 'write missing') write = undefined;
      if (kind === 'read empty') read = '';
      if (kind === 'write empty') write = '';
      if (kind === 'read whitespace') read = ' \t\n ';
      if (kind === 'write whitespace') write = ' \t\n ';
      if (kind === 'equal') write = read;
      if (kind === 'invalid type') read = 123;
      // Act / Assert
      expect(() => configured(read, write)).toThrow('Configuración de acceso inválida');
    },
  );

  it('devuelve perfiles explícitos y no serializa credenciales ni sus digests', () => {
    const read = fresh(); const write = fresh();
    const config = configured(read, write);
    expect(config.authenticate(read)).toBe('read');
    expect(config.authenticate(write)).toBe('write');
    expect(JSON.stringify(config)).toBe('{}');
  });

  it.each(['missing', 'empty', 'spaces', 'wrong', 'array', 'combined', 'different length', 'unicode'])(
    'rechaza cabecera %s con 401 genérico', (kind) => {
      const read = fresh(); const write = fresh(); const config = configured(read, write);
      const inputs: Record<string, unknown> = {
        missing: undefined, empty: '', spaces: '  ', wrong: fresh(), array: [read],
        combined: `${read}, ${write}`, 'different length': 'x', unicode: 'clave-\u2764',
      };
      try { config.authenticate(inputs[kind]); throw new Error('Se esperaba rechazo'); }
      catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as Error).message).toBe('Clave de acceso ausente o inválida');
        expect(JSON.stringify(error).includes(read)).toBe(false);
        expect(JSON.stringify(error).includes(write)).toBe(false);
      }
    },
  );

  it('reconstruir configuración invalida gestión anterior y conserva consulta', () => {
    const read = fresh(); const oldWrite = fresh(); const newWrite = fresh();
    expect(configured(read, oldWrite).authenticate(oldWrite)).toBe('write');
    const rotated = configured(read, newWrite);
    expect(() => rotated.authenticate(oldWrite)).toThrow(UnauthorizedException);
    expect(rotated.authenticate(newWrite)).toBe('write');
    expect(rotated.authenticate(read)).toBe('read');
  });
});

describe('P12 guard (unitarias sin HTTP/DB)', () => {
  it.each([
    ['read', 'read', true], ['write', 'read', true], ['write', 'write', true],
    ['read', 'write', false], ['write', undefined, false],
  ] as const)('perfil %s / permiso %s', (profile, permission, allowed) => {
    const authenticate = jest.fn().mockReturnValue(profile);
    const reflect = jest.fn().mockReturnValue(permission);
    const context = {
      getHandler: () => () => undefined, getClass: () => class Controller {},
      switchToHttp: () => ({ getRequest: () => ({ headers: { 'x-api-key': 'entrada-sintetica-no-configurada' } }) }),
    } as unknown as ExecutionContext;
    const guard = new ApiKeyGuard({ authenticate } as unknown as ApiKeyConfig,
      { getAllAndOverride: reflect } as unknown as Reflector);
    if (allowed) expect(guard.canActivate(context)).toBe(true);
    else expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(reflect).toHaveBeenCalledTimes(1);
  });

  it('autentica antes de resolver permisos', () => {
    const authenticate = jest.fn(() => { throw new UnauthorizedException(); });
    const reflect = jest.fn();
    const context = { switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) } as unknown as ExecutionContext;
    const guard = new ApiKeyGuard({ authenticate } as unknown as ApiKeyConfig,
      { getAllAndOverride: reflect } as unknown as Reflector);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(reflect).not.toHaveBeenCalled();
  });
});
