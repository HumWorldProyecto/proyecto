import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiKeyPermission } from './api-key.config';
import { API_KEY_PERMISSION, ApiKeyGuard } from './api-key.guard';

export function RequireApiKey(permission: ApiKeyPermission) {
  return applyDecorators(
    SetMetadata(API_KEY_PERMISSION, permission),
    UseGuards(ApiKeyGuard),
    ApiSecurity('apiKey'),
    ApiUnauthorizedResponse({ description: 'Clave de acceso ausente o inválida' }),
    ...(permission === 'write'
      ? [ApiForbiddenResponse({ description: 'La clave no permite esta operación' })]
      : []),
  );
}
