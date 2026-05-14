import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import {
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '@sintezaur/auth';
import { StorageService } from '../common/storage.service';
import {
  CreateListingDto,
  CreateSavedSearchDto,
  MakeOfferDto,
  SendChatMessageDto,
  SubmitReviewDto,
  UpdateListingDto,
  UpdateSavedSearchDto,
} from './bazar.dto';
import { ChatService } from './chat.service';
import { ListingsService } from './listings.service';
import {
  SavedSearchService,
  type SavedSearchQueryShape,
} from './saved-search.service';
import { TransactionReviewsService } from './transaction-reviews.service';
import { TransactionsService } from './transactions.service';
import { WatchService } from './watch.service';

@Controller('me/bazar')
@UseGuards(JwtAuthGuard)
export class MeBazarController {
  constructor(
    private readonly listings: ListingsService,
    private readonly savedSearch: SavedSearchService,
    private readonly watch: WatchService,
    private readonly chat: ChatService,
    private readonly transactions: TransactionsService,
    private readonly reviews: TransactionReviewsService,
  ) {}

  /* ============ listings ============ */

  @Post('listings')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateListingDto,
  ) {
    return this.listings.create(user.sub, dto);
  }

  @Patch('listings/:id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listings.update(user.sub, id, dto);
  }

  @Post('listings/:id/refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refresh(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.listings.refresh(user.sub, id);
  }

  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.listings.removeOwn(user.sub, id);
  }

  /* ============ photos ============ */

  @Post('listings/:id/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: StorageService.MAX_INPUT_BYTES },
    }),
  )
  attachPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.listings.attachPhoto(user.sub, id, file);
  }

  @Delete('listings/:id/photos/:sourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detachPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    await this.listings.detachPhoto(user.sub, id, sourceId);
  }

  @Post('listings/:id/photos/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderPhotos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('order') order: string[],
  ) {
    await this.listings.reorderPhotos(user.sub, id, order);
  }

  /* ============ saved searches ============ */

  @Get('saved-searches')
  listSavedSearches(@CurrentUser() user: AuthenticatedUser) {
    return this.savedSearch.list(user.sub);
  }

  @Post('saved-searches')
  createSavedSearch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSavedSearchDto,
  ) {
    return this.savedSearch.create(
      user.sub,
      dto.name,
      dto.query as SavedSearchQueryShape,
      dto.notifyMode ?? 'instant',
    );
  }

  @Patch('saved-searches/:id')
  updateSavedSearch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    return this.savedSearch.update(user.sub, id, {
      name: dto.name,
      query: dto.query as SavedSearchQueryShape | undefined,
      notifyMode: dto.notifyMode,
    });
  }

  @Delete('saved-searches/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSavedSearch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.savedSearch.remove(user.sub, id);
  }

  /* ============ watches (hearts) ============ */

  @Get('watches')
  listWatches(@CurrentUser() user: AuthenticatedUser) {
    return this.watch.listForUser(user.sub);
  }

  @Post('listings/:id/watch')
  @HttpCode(HttpStatus.NO_CONTENT)
  async watchListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.watch.watch(user.sub, id);
  }

  @Delete('listings/:id/watch')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unwatchListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.watch.unwatch(user.sub, id);
  }

  /* ============ chat ============ */

  @Get('threads')
  inbox(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.listInbox(user.sub);
  }

  @Get('threads/:id')
  thread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chat.readThread(user.sub, id);
  }

  @Post('listings/:listingId/threads/messages')
  startThread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chat.sendMessage(user.sub, { listingId, body: dto.body });
  }

  @Post('threads/:id/messages')
  postMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chat.sendMessage(user.sub, { threadId: id, body: dto.body });
  }

  @Post('threads/:id/offers')
  makeOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MakeOfferDto,
  ) {
    return this.chat.makeOffer(user.sub, {
      threadId: id,
      amount: dto.amount,
      currency: dto.currency,
      note: dto.note,
      repliesToMessageId: dto.repliesToMessageId,
    });
  }

  @Post('listings/:listingId/offers')
  openOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() dto: MakeOfferDto,
  ) {
    return this.chat.makeOffer(user.sub, {
      listingId,
      amount: dto.amount,
      currency: dto.currency,
      note: dto.note,
    });
  }

  @Post('threads/:threadId/offers/:offerId/accept')
  acceptOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    return this.chat.respondToOffer(user.sub, threadId, offerId, true);
  }

  @Post('threads/:threadId/offers/:offerId/reject')
  rejectOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    return this.chat.respondToOffer(user.sub, threadId, offerId, false);
  }

  /* ============ transactions ============ */

  @Post('threads/:id/confirm-transaction')
  confirmTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transactions.confirm(user.sub, id);
  }

  @Get('threads/:id/transaction')
  getTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transactions.getByThread(user.sub, id);
  }

  /* ============ reviews ============ */

  @Post('transactions/:id/review')
  submitReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.reviews.submit(user.sub, id, dto.rating, dto.body);
  }
}
