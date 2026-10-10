import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Données publiques lues par le site au chargement.
 * Les coordonnées se modifient dans les variables d'environnement,
 * sans toucher au HTML.
 */
@SkipThrottle()
@Controller()
export class SiteController {
  constructor(private readonly config: ConfigService) {}

  @Get('config')
  getPublicConfig() {
    return {
      whatsapp: this.config.get<string>('WHATSAPP_NUMBER', '41790000000'),
      whatsappDisplay: this.config.get<string>('WHATSAPP_DISPLAY', '+41 79 000 00 00'),
      email: this.config.get<string>('CONTACT_EMAIL', 'contact@immofilms.ch'),
      waMessage: this.config.get<string>(
        'WHATSAPP_MESSAGE',
        'Bonjour ImmoFilms, je souhaite recevoir une démo gratuite pour une de nos annonces.',
      ),
    };
  }

  @Get('health')
  health() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }
}
