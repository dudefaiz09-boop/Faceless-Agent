import { ApiClient } from '../client/base.js';
import { Announcement, AnnouncementInput } from '@educonnect/shared';
export declare class AnnouncementsService {
    private client;
    constructor(client: ApiClient);
    getAll(): Promise<Announcement[]>;
    create(data: AnnouncementInput): Promise<Announcement>;
    delete(id: string): Promise<unknown>;
}
