import { Controller, Get, Param } from '@nestjs/common';
import { PayService } from './pay.service';

@Controller('pay')
export class PayController {
  constructor(private payService: PayService) {}

  /** Public — customer payment page data (no auth). */
  @Get(':token')
  getPaymentPage(@Param('token') token: string) {
    return this.payService.getByToken(token);
  }
}
