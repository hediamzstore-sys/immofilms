import { Module } from '@nestjs/common';
import { ContactModule } from '../contact/contact.module';
import { SiteController } from './site.controller';

@Module({
  imports: [ContactModule],
  controllers: [SiteController],
})
export class SiteModule {}
