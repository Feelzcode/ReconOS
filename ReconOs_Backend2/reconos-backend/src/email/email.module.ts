import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailNotificationsService } from './email-notifications.service';

@Global()
@Module({
  providers: [EmailService, EmailNotificationsService],
  exports: [EmailService, EmailNotificationsService],
})
export class EmailModule {}
