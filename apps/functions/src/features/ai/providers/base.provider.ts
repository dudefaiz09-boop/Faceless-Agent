import { UserContext } from '../../../lib/context.js';

export interface AiModuleProvider {
  getModuleContext(user: UserContext, tenantId: string): Promise<string | null>;
}
