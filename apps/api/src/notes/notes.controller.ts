import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { UpsertNoteDto } from './dto/upsert-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Personal Study Notes & Lesson Bookmarks')
@Controller('notes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'List all personal study notes and bookmarked lessons' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'bookmarkedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  async getMyNotes(
    @CurrentUser('id') userId: string,
    @Query('courseId') courseId?: string,
    @Query('bookmarkedOnly') bookmarkedOnly?: string,
    @Query('search') search?: string,
  ) {
    return this.notesService.getMyNotes(userId, {
      courseId,
      bookmarkedOnly: bookmarkedOnly === 'true',
      search,
    });
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Retrieve personal note and bookmark state for a lesson' })
  async getLessonNote(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.notesService.getLessonNote(userId, lessonId);
  }

  @Put('lesson/:lessonId')
  @ApiOperation({ summary: 'Save or update personal study note and bookmark state for a lesson' })
  @ApiResponse({ status: 200, description: 'Study note saved' })
  async upsertLessonNote(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpsertNoteDto,
  ) {
    return this.notesService.upsertLessonNote(userId, lessonId, dto);
  }

  @Patch('lesson/:lessonId/bookmark')
  @ApiOperation({ summary: 'Toggle or set bookmark status on a lesson' })
  async toggleBookmark(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body('isBookmarked') isBookmarked?: boolean,
  ) {
    return this.notesService.toggleBookmark(userId, lessonId, isBookmarked);
  }

  @Delete('lesson/:lessonId')
  @ApiOperation({ summary: 'Delete personal note for a lesson' })
  async deleteLessonNote(
    @CurrentUser('id') userId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.notesService.deleteLessonNote(userId, lessonId);
  }
}

