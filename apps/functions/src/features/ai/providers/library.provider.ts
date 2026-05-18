<<<<<<< HEAD
import { db } from '../../../lib/documents.js';
import { AiUserContext, AiModule } from '../ai-context.service.js';
import { AiContextProvider } from './base.provider.js';

export class LibraryProvider implements AiContextProvider {
  module: AiModule = 'library';

  async getContext(context: AiUserContext): Promise<string | null> {
    const { uid, role, tenantId } = context;

    if (role === 'student' || role === 'teacher' || role === 'librarian') {
      const snap = await db
        .collection('library')
        .where('tenantId', '==', tenantId)
        .where('studentId', '==', uid) // Assumes teachers/students use studentId for checkouts
        .get();
      return `[Library] You have ${snap.size} books currently issued.`;
    }

    if (['admin', 'principal'].includes(role)) {
        const snap = await db.collection('library').where('tenantId', '==', tenantId).limit(5).get();
        return `[Library Overview] Recent borrowing records count: ${snap.size}.`;
    }

    return null;
=======
import { getSupabaseAdmin } from '../../../lib/supabase.js';
import { UserContext } from '../../../lib/context.js';
import { AiModuleProvider } from './base.provider.js';

export class LibraryProvider implements AiModuleProvider {
  async getModuleContext(user: UserContext, _tenantId: string): Promise<string | null> {
    const { uid, role, linkedStudentIds } = user;
    const supabase = getSupabaseAdmin();

    const targetIds = role === 'student' ? [uid] : role === 'parent' ? linkedStudentIds : [];
    if (targetIds.length === 0) return null;

    const { data, error } = await supabase
      .from('borrowed_books')
      .select('*, library_books(title)')
      .in('borrower_id', targetIds)
      .eq('status', 'borrowed');

    if (error || !data) return null;

    if (data.length === 0) return '[Library] No books currently issued.';

    const list = data.map((d: { library_books?: { title: string } | null; due_at?: string }) => {
      const bookTitle = d.library_books?.title || 'Unknown Book';
      return `${bookTitle} (Due: ${d.due_at || 'N/A'})`;
    });
    return `[Library] Currently issued books:\n${list.join('\n')}`;
>>>>>>> origin/main
  }
}
