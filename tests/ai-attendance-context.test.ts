import { AiContextService } from '../apps/functions/src/features/ai/ai-context.service.js';
import { db } from '../apps/functions/src/lib/documents.js';

jest.mock('../apps/functions/src/lib/documents.js', () => ({
  db: {
    collection: jest.fn(),
  },
}));

describe('AiContextService Attendance Logic', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('infers attendance module from "was I present yesterday"', () => {
    const modules = AiContextService.inferModulesFromQuery('was I present yesterday?');
    expect(modules).toContain('attendance');
  });

  it('fetches student attendance context for today and yesterday', async () => {
    const mockSnap = {
      docs: [
        {
          data: () => ({
            date: new Date().toISOString().split('T')[0],
            records: [{ studentId: 'student123', status: 'present' }],
          }),
        },
      ],
    };

    const mockCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnap),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    (db.collection as jest.Mock).mockReturnValue(mockCollection);

    const context = await AiContextService.getModuleContext(mockContext, ['attendance']);

    expect(db.collection).toHaveBeenCalledWith('attendance');
    expect(mockCollection.where).toHaveBeenCalledWith('tenantId', '==', 'test-school');
    expect(mockCollection.where).toHaveBeenCalledWith('classId', '==', 'classA');
    expect(context).toContain('present');
    expect(context).toContain(new Date().toISOString().split('T')[0]);
  });

  it('returns appropriate message when no attendance record is found', async () => {
    const emptySnap = { docs: [] };
    const mockCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(emptySnap),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    (db.collection as jest.Mock).mockReturnValue(mockCollection);

    const context = await AiContextService.getModuleContext(mockContext, ['attendance']);

    expect(context).toContain('No records found for your student ID');
  });

  it('allows admins to see attendance overview', async () => {
    const adminContext = { ...mockContext, role: 'admin' };
    const mockSnap = {
      docs: [
        {
          data: () => ({
            date: '2024-05-20',
            classId: 'classA',
            records: [{ status: 'present' }, { status: 'absent' }],
          }),
        },
      ],
    };

    const mockCollection = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnap),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    (db.collection as jest.Mock).mockReturnValue(mockCollection);

    const context = await AiContextService.getModuleContext(adminContext, ['attendance']);

    expect(context).toContain('[Attendance Overview]');
    expect(context).toContain('2024-05-20 (classA): 1/2 present');
  });
});
