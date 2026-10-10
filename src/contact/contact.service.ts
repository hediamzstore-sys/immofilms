import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { CreateContactDto } from './dto/create-contact.dto';
import { MailService } from './mail.service';

export interface Lead {
  date: string;
  nom: string;
  telephone: string;
  email: string;
  message: string;
  formule?: string;
  ip: string;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly dataDir = join(process.cwd(), 'data');

  constructor(private readonly mail: MailService) {}

  async handle(dto: CreateContactDto, ip: string): Promise<void> {
    // Robot détecté : on répond « OK » sans rien faire.
    if (dto.website) {
      this.logger.warn(`Envoi ignoré (champ piège rempli) depuis ${ip}`);
      return;
    }

    const lead: Lead = {
      date: new Date().toISOString(),
      nom: dto.nom,
      telephone: dto.telephone,
      email: dto.email,
      message: dto.message ?? '',
      formule: dto.formule,
      ip,
    };

    // 1) Copie de sécurité locale : aucune demande perdue, même si l'email échoue.
    const saved = await this.save(lead);

    // 2) Notification par email.
    let mailed = false;
    if (this.mail.isConfigured()) {
      try {
        await this.mail.sendLead(lead);
        mailed = true;
      } catch (err) {
        this.logger.error(`Échec de l'envoi email : ${(err as Error).message}`);
      }
    } else {
      this.logger.warn('SMTP non configuré : la demande est seulement enregistrée dans data/leads.jsonl');
    }

    this.logger.log(`Nouvelle demande de démo : ${lead.nom} <${lead.email}>`);

    if (!saved && !mailed) {
      throw new ServiceUnavailableException(
        "L'envoi n'a pas abouti. Merci de nous contacter directement par email ou WhatsApp.",
      );
    }
  }

  private async save(lead: Lead): Promise<boolean> {
    try {
      await mkdir(this.dataDir, { recursive: true });
      await appendFile(join(this.dataDir, 'leads.jsonl'), JSON.stringify(lead) + '\n', 'utf8');
      return true;
    } catch (err) {
      this.logger.error(`Impossible d'enregistrer la demande : ${(err as Error).message}`);
      return false;
    }
  }
}
