import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RssHttpConfigModule } from '../rss-http/rss-http-config.module';
import { SourcesController } from './controllers/sources.controller';
import { SourceUrlNormalizer } from './domain/source-url-normalizer';
import { DNS_RESOLVER, NodeDnsResolver } from './integrations/dns-resolver';
import { PinnedAgentFactory } from './integrations/pinned-agent.factory';
import { PrismaSourceRegistry } from './integrations/prisma-source-registry';
import { SourceAccessibilityChecker } from './integrations/source-accessibility-checker';
import { SOURCE_REPOSITORY_PORT } from './ports/source-repository.port';
import { SOURCE_REGISTRY_PORT } from './ports/source-registry.port';
import { PrismaSourceRepository } from './repositories/prisma-source.repository';
import { PublicIpPolicy } from './security/ip-address-policy';
import { SourceDestinationResolver } from './security/source-destination-resolver';
import { SourcesService } from './services/sources.service';

@Module({
  imports: [HttpModule, RssHttpConfigModule, PrismaModule],
  controllers: [SourcesController],
  providers: [
    SourceUrlNormalizer,
    PublicIpPolicy,
    NodeDnsResolver,
    { provide: DNS_RESOLVER, useExisting: NodeDnsResolver },
    SourceDestinationResolver,
    PinnedAgentFactory,
    SourceAccessibilityChecker,
    { provide: SOURCE_REPOSITORY_PORT, useClass: PrismaSourceRepository },
    SourcesService,
    PrismaSourceRegistry,
    { provide: SOURCE_REGISTRY_PORT, useExisting: PrismaSourceRegistry },
  ],
  exports: [
    SourceUrlNormalizer,
    SourceDestinationResolver,
    PinnedAgentFactory,
    SourceAccessibilityChecker,
    SOURCE_REGISTRY_PORT,
  ],
})
export class SourcesModule {}
