import { Module } from '@nestjs/common';
import { SearchProfileController } from './search-profile.controller';
import { SearchProfileService } from './search-profile.service';

@Module({
  controllers: [SearchProfileController],
  providers: [SearchProfileService],
  exports: [SearchProfileService],
})
export class SearchProfileModule {}
