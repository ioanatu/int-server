import { Module } from '@nestjs/common';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { IndustriesController } from './industries.controller';
import { IndustriesService } from './industries.service';

@Module({
  // Industries are derived from the supplier fixtures, so this module reuses the
  // suppliers repository rather than reading the data a second time.
  imports: [SuppliersModule],
  controllers: [IndustriesController],
  providers: [IndustriesService],
  exports: [IndustriesService],
})
export class IndustriesModule {}
