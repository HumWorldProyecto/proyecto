import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyConfig, ApiKeyPermission } from './api-key.config';

export const API_KEY_PERMISSION = 'humworld:api-key-permission';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly keys: ApiKeyConfig, private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const profile = this.keys.authenticate(request.headers['x-api-key']);
    const permission = this.reflector.getAllAndOverride<ApiKeyPermission>(API_KEY_PERMISSION, [
      context.getHandler(), context.getClass(),
    ]);
    if (permission === 'read' || (permission === 'write' && profile === 'write')) return true;
    throw new ForbiddenException('La clave no permite esta operación');
  }
}
