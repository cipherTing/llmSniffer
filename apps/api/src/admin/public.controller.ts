import { Controller, Get, Header } from '@nestjs/common';
import { PublicRelaysService } from './public-relays.service';

@Controller('api/public')
export class PublicController {
  constructor(private readonly publicRelaysService: PublicRelaysService) {}

  @Get('relays')
  @Header('Cache-Control', 'no-store')
  getRelays() {
    return this.publicRelaysService.getSnapshot();
  }
}
