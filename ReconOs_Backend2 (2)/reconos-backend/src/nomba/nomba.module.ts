// src/nomba/nomba.module.ts
//
// ╔══════════════════════════════════════════════════════════╗
// ║  THIS IS THE ONE FILE YOU CHANGE ON ONBOARDING DAY      ║
// ║                                                          ║
// ║  Before July 1 (USE_MOCK_NOMBA=true):                   ║
// ║    provider: MockNombaProvider                           ║
// ║                                                          ║
// ║  From July 1 (USE_MOCK_NOMBA=false):                    ║
// ║    provider: RealNombaProvider                           ║
// ║                                                          ║
// ║  Everything else in the codebase stays unchanged.        ║
// ╚══════════════════════════════════════════════════════════╝

import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NOMBA_PROVIDER } from './nomba.interface';
import { MockNombaProvider } from './mock-nomba.provider';
import { RealNombaProvider } from './nomba.provider';

@Global()
@Module({
  providers: [
    MockNombaProvider,
    RealNombaProvider,
    {
      provide: NOMBA_PROVIDER,
      useFactory: (config: ConfigService, mock: MockNombaProvider, real: RealNombaProvider) => {
        const useMock = config.get('USE_MOCK_NOMBA', 'true') === 'true';
        if (useMock) {
          console.log('🔧 Using MockNombaProvider — switch USE_MOCK_NOMBA=false on July 1');
          return mock;
        }
        console.log('✅ Using RealNombaProvider — Nomba API active');
        return real;
      },
      inject: [ConfigService, MockNombaProvider, RealNombaProvider],
    },
  ],
  exports: [NOMBA_PROVIDER, MockNombaProvider],
})
export class NombaModule {}
