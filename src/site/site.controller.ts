import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { MailService } from '../contact/mail.service';

/**
 * Données publiques lues par le site au chargement.
 * Les coordonnées se modifient dans les variables d'environnement,
 * sans toucher au HTML.
 */
@SkipThrottle()
@Controller()
export class SiteController {
  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  /** Ignore les anciennes valeurs d'exemple encore présentes dans hPanel. */
  private value(key: string, fallback: string, placeholders: string[] = []): string {
    const v = (this.config.get<string>(key) ?? '').trim();
    return v && !placeholders.includes(v) ? v : fallback;
  }

  @Get('config')
  getPublicConfig() {
    return {
      whatsapp: this.value('WHATSAPP_NUMBER', '41795075556', ['41790000000']),
      whatsappDisplay: this.value('WHATSAPP_DISPLAY', '+41 79 507 55 56', ['+41 79 000 00 00']),
      email: this.config.get<string>('CONTACT_EMAIL', 'contact@immofilms.ch'),
      waMessage: this.config.get<string>(
        'WHATSAPP_MESSAGE',
        'Bonjour ImmoFilms, je souhaite recevoir une démo gratuite pour une de nos annonces.',
      ),
    };
  }

  @Get('health')
  async health() {
    let demandesRecues = 0;
    try {
      const raw = await readFile(join(process.cwd(), 'data', 'leads.jsonl'), 'utf8');
      demandesRecues = raw.split('\n').filter(Boolean).length;
    } catch {
      /* aucun fichier = aucune demande */
    }
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      version: '2026-10-14',
      email: this.mail.status(),
      demandesRecues,
    };
  }
}
