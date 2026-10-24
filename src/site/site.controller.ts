import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { existsSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { extname, join } from 'path';
import { MailService } from '../contact/mail.service';
import { ENV_FILES_FOUND } from '../config/env-files';

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

  /**
   * Logos des agences clientes affichés en bandeau sur le site.
   * Il suffit de déposer les fichiers dans public/assets/clients/.
   */
  @Get('clients')
  async clients() {
    const dir = [join(__dirname, '..', 'public'), join(__dirname, '..', '..', 'public')]
      .map((d) => join(d, 'assets', 'clients'))
      .find((d) => existsSync(d));
    if (!dir) return [];
    const files = (await readdir(dir)).filter((f) => /^[^.].*\.(png|jpe?g|svg|webp)$/i.test(f)).sort();
    return files.map((f) => ({
      src: `/assets/clients/${encodeURIComponent(f)}`,
      name: f.slice(0, -extname(f).length).replace(/[-_]+/g, ' ').replace(/^\w/, (ch) => ch.toUpperCase()),
    }));
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
      version: '2026-10-24',
      configuration: {
        fichiersEnvTrouves: ENV_FILES_FOUND.length,
        variablesSystemeSmtp: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO'].filter((k) => !!process.env[k]).length,
        variablesSystemeTotal: Object.keys(process.env).length,
      },
      email: this.mail.status(),
      demandesRecues,
    };
  }
}
