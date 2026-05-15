import { validateFeesCSV, validatePerformanceCSV } from '../apps/web/src/lib/csvValidator.ts';

describe('CSV Validator', () => {
  describe('validateFeesCSV', () => {
    it('accepts valid fees CSV rows', () => {
      const input = ['student-1, 1000, 2026-05-15', 'student-2, 500.5, 2026-06-01'].join('\n');
      const result = validateFeesCSV(input);

      expect(result.isValid).toBe(true);
      expect(result.records).toHaveLength(2);
      expect(result.records?.[0]).toEqual({
        studentId: 'student-1',
        amountDue: 1000,
        dueDate: '2026-05-15',
      });
    });

    it('rejects rows with invalid amounts', () => {
      const result = validateFeesCSV('student-1, -10, 2026-05-15');
      expect(result.isValid).toBe(false);
      expect(result.errors?.[0]).toEqual(
        expect.objectContaining({
          line: 1,
          message: expect.stringContaining('Invalid amount due'),
        })
      );
    });
  });

  describe('validatePerformanceCSV', () => {
    it('rejects rows with invalid grade', () => {
      const result = validatePerformanceCSV('student-1, Math, Term 1, 80, Z');
      expect(result.isValid).toBe(false);
      expect(result.errors?.[0]).toEqual(
        expect.objectContaining({
          line: 1,
          message: expect.stringContaining('Invalid grade'),
        })
      );
    });
  });
});
