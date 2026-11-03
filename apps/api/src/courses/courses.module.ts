import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { MarketplaceController } from './marketplace.controller';
import { CoursesService } from './courses.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController, MarketplaceController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
