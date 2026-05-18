<<<<<<< HEAD
import { AiUserContext, AiModule } from '../ai-context.service.js';

export interface AiContextProvider {
  module: AiModule;
  getContext(context: AiUserContext): Promise<string | null>;
=======
import { UserContext } from '../../../lib/context.js';

export interface AiModuleProvider {
  getModuleContext(user: UserContext, tenantId: string): Promise<string | null>;
>>>>>>> origin/main
}
