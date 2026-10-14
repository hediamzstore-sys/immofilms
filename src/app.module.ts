import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ENV_FILES_FOUND } from './config/env-files';
import { ContactModule } from './contact/contact.module';
import { SiteModule } from './site/site.module';

@Module({
  imports: [
    // Les variables du système (hPanel) restent prioritaires sur les fichiers .env.
    ConfigModule.forRoot({ isGlobal: true, cache: true, envFilePath: ENV_FILES_FOUND }),
    // Limite globale généreuse pour l'API ; le formulaire a sa propre limite.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    SiteModule,
    ContactModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
