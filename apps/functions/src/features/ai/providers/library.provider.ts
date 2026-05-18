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
  }
}
