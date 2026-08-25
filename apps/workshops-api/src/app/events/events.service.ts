import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { accessEvents } from '../../db/schema';
import type { SessionRole } from '../auth/session';

export interface RecordEventInput {
  workshopId?: string;
  visitorId?: string;
  role: SessionRole;
  event: 'login' | 'view' | 'download';
  document?: string;
  lang?: string;
}

@Injectable()
export class EventsService {
  constructor(private readonly dbService: DbService) {}

  /** Fire-and-forget analytics write — never fails a user request. */
  record(input: RecordEventInput): void {
    void this.dbService.db
      .insert(accessEvents)
      .values({
        workshopId: input.workshopId ?? null,
        visitorId: input.visitorId ?? null,
        role: input.role,
        event: input.event,
        document: input.document ?? null,
        lang: input.lang ?? null,
      })
      .catch((err) => console.error('[events] insert failed:', err));
  }
}
