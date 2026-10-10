import { Body, Controller, HttpCode, Ip, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

const LIMIT = Number(process.env.CONTACT_RATE_LIMIT) || 5;

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  /** Demande de démo gratuite envoyée depuis le formulaire du site. */
  @Post()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60 * 60_000, limit: LIMIT } })
  async create(@Body() dto: CreateContactDto, @Ip() ip: string) {
    await this.contact.handle(dto, ip);
    return {
      ok: true,
      message: 'Merci ! Votre demande est bien partie. Nous revenons vers vous très rapidement avec votre démo.',
    };
  }
}
