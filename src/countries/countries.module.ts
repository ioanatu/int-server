import { Module } from '@nestjs/common';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';

@Module({
  // Countries are derived from the supplier fixtures, so this module reuses the
  // suppliers repository rather than reading the data a second time.
  imports: [SuppliersModule],
  controllers: [CountriesController],
  providers: [CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}
