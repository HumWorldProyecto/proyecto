import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RssHttpConfigModule } from '../rss-http/rss-http-config.module';
import { SourceUrlNormalizer } from './domain/source-url-normalizer';
import { DNS_RESOLVER, NodeDnsResolver } from './integrations/dns-resolver';
import { PinnedAgentFactory } from './integrations/pinned-agent.factory';
import { SourceAccessibilityChecker } from './integrations/source-accessibility-checker';
import { PublicIpPolicy } from './security/ip-address-policy';
import { SourceDestinationResolver } from './security/source-destination-resolver';

@Module({
  imports: [HttpModule, RssHttpConfigModule],
  providers: [
    SourceUrlNormalizer,
    PublicIpPolicy,
    NodeDnsResolver,
    { provide: DNS_RESOLVER, useExisting: NodeDnsResolver },
    SourceDestinationResolver,
    PinnedAgentFactory,
    SourceAccessibilityChecker,
  ],
  exports: [SourceUrlNormalizer, SourceAccessibilityChecker],
})
export class SourcesModule {}
