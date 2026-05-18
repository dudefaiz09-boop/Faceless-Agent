import { AiContextService } from '../apps/functions/src/features/ai/ai-context.service.js';
import { getSupabaseAdmin } from '../apps/functions/src/lib/supabase.js';

jest.mock('../apps/functions/src/lib/supabase.js', () => ({
  getSupabaseAdmin: jest.fn(),
}));

describe('AiContextService Attendance Logic (Supabase)', () => {
  const mockContext: any = {
    uid: 'student123',
    role: 'student',
    tenantId: 'test-school',
    schoolId: 'test-school',
    classId: 'classA',
    classIds: ['classA'],
    linkedStudentIds: [],
    permissions: {},
  };

  const mockSupabase: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseAdmin as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('infers attendance module from "was I present yesterday"', () => {
    const modules = AiContextService.inferModulesFromQuery('was I present yesterday?');
    expect(modules).toContain('attendance');
  });

  it('fetches student attendance context using Supabase', async () => {
    mockSupabase.limit.mockResolvedValue({
      data: [
        {
          attendance_date: '2024-05-20',
          status: 'present',
        },
      ],
      error: null,
    });

    const context = await AiContextService.getModuleContext(mockContext, ['attendance']);

    expect(mockSupabase.from).toHaveBeenCalledWith('attendance');
    expect(mockSupabase.eq).toHaveBeenCalledWith('school_id', 'test-school');
    expect(mockSupabase.eq).toHaveBeenCalledWith('student_id', 'student123');
    expect(context).toContain('present');
    expect(context).toContain('2024-05-20');
  });

  it('returns appropriate message when no attendance record is found', async () => {
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    const context = await AiContextService.getModuleContext(mockContext, ['attendance']);

    expect(context).toContain('No records found for you');
  });

  it('allows admins to see attendance overview', async () => {
    const adminContext = { ...mockContext, role: 'admin' };
    mockSupabase.limit.mockResolvedValue({
      data: [
        {
          attendance_date: '2024-05-20',
          class_id: 'classA',
          status: 'present',
        },
      ],
      error: null,
    });

    const context = await AiContextService.getModuleContext(adminContext, ['attendance']);

    expect(context).toContain('[Attendance Overview]');
    expect(context).toContain('2024-05-20 (classA): present');
  });

  it('handles parent context for linked students', async () => {
    const parentContext = {
      ...mockContext,
      role: 'parent',
      linkedStudentIds: ['student1', 'student2'],
    };
    mockSupabase.limit.mockResolvedValue({
      data: [
        { student_id: 'student1', attendance_date: '2024-05-21', status: 'present' },
        { student_id: 'student2', attendance_date: '2024-05-21', status: 'absent' },
      ],
      error: null,
    });

    const context = await AiContextService.getModuleContext(parentContext, ['attendance']);

    expect(mockSupabase.in).toHaveBeenCalledWith('student_id', ['student1', 'student2']);
    expect(context).toContain('Student student1: 2024-05-21: present');
    expect(context).toContain('Student student2: 2024-05-21: absent');
  });
});
