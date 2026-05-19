/**
 * CSV VALIDATOR - Shared validation utility for bulk data imports
 * Validates Fees and Performance data with detailed error reporting
 */

export interface CSVValidationError {
  line: number;
  message: string;
  value: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  records?: T[];
  errors?: CSVValidationError[];
}

/**
 * Validate Fees CSV Format
 * Expected format: studentId,amountDue,dueDate,status,amountPaid
 */
export function validateFeesCSV(csvText: string): ValidationResult<{
  studentId: string;
  amountDue: number;
  dueDate: string;
  status?: 'pending' | 'paid' | 'partial';
  amountPaid?: number;
}> {
  const lines = csvText
    .split('\n')
    .map((line) => line.trim())
    .filter((l) => l !== '');
  const errors: CSVValidationError[] = [];
  const records = [];
  const dataLines = lines[0]?.toLowerCase().startsWith('studentid,') ? lines.slice(1) : lines;

  for (let i = 0; i < dataLines.length; i++) {
    const line = i + 1; // 1-indexed for user messages
    const trimmed = dataLines[i].trim();

    if (!trimmed) continue;

    const parts = trimmed.split(',').map((s) => s.trim());

    // Check field count
    if (![3, 5].includes(parts.length)) {
      errors.push({
        line,
        message: `Expected 3 or 5 fields (studentId, amountDue, dueDate, status, amountPaid), got ${parts.length}`,
        value: trimmed,
      });
      continue;
    }

    const hasPaymentColumns = parts.length === 5;
    const [studentId, amountDueStr, dueDate, status = 'pending', amountPaidStr = '0'] = parts;

    // Validate studentId
    if (!studentId || studentId.length === 0) {
      errors.push({
        line,
        message: 'Student ID cannot be empty',
        value: trimmed,
      });
      continue;
    }

    // Validate amountDue
    const amountDue = parseFloat(amountDueStr);
    if (isNaN(amountDue) || amountDue <= 0) {
      errors.push({
        line,
        message: `Invalid amount due: "${amountDueStr}" (must be a positive number)`,
        value: trimmed,
      });
      continue;
    }

    // Validate date format (yyyy-mm-dd)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate)) {
      errors.push({
        line,
        message: `Invalid date format: "${dueDate}" (expected yyyy-mm-dd)`,
        value: trimmed,
      });
      continue;
    }

    // Validate date is valid
    const dateObj = new Date(dueDate);
    if (isNaN(dateObj.getTime())) {
      errors.push({
        line,
        message: `Invalid date: "${dueDate}" is not a valid date`,
        value: trimmed,
      });
      continue;
    }

    const record: {
      studentId: string;
      amountDue: number;
      dueDate: string;
      status?: 'pending' | 'paid' | 'partial';
      amountPaid?: number;
    } = {
      studentId,
      amountDue,
      dueDate,
    };

    if (hasPaymentColumns) {
      const amountPaid = parseFloat(amountPaidStr || '0');
      if (isNaN(amountPaid) || amountPaid < 0) {
        errors.push({
          line,
          message: `Invalid amount paid: "${amountPaidStr}" (must be zero or a positive number)`,
          value: trimmed,
        });
        continue;
      }

      if (!['pending', 'paid', 'partial'].includes(status.toLowerCase())) {
        errors.push({
          line,
          message: `Invalid status: "${status}" (expected pending, paid, or partial)`,
          value: trimmed,
        });
        continue;
      }

      record.status = status.toLowerCase() as 'pending' | 'paid' | 'partial';
      record.amountPaid = amountPaid;
    }

    records.push(record);
  }

  return {
    isValid: errors.length === 0,
    records: errors.length === 0 ? records : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate Performance CSV Format
 * Expected format: studentId, subject, term, score, grade
 */
export function validatePerformanceCSV(csvText: string): ValidationResult<{
  studentId: string;
  subject: string;
  term: string;
  score: number;
  grade: string;
}> {
  const lines = csvText
    .split('\n')
    .map((line) => line.trim())
    .filter((l) => l !== '');
  const errors: CSVValidationError[] = [];
  const records = [];
  const validGrades = ['A', 'B', 'C', 'D', 'F', 'A+', 'A-', 'B+', 'B-', 'C+', 'C-'];
  const dataLines = lines[0]?.toLowerCase().startsWith('studentid,') ? lines.slice(1) : lines;

  for (let i = 0; i < dataLines.length; i++) {
    const line = i + 1; // 1-indexed for user messages
    const trimmed = dataLines[i].trim();

    if (!trimmed) continue;

    const parts = trimmed.split(',').map((s) => s.trim());

    // Check field count
    if (![5, 6].includes(parts.length)) {
      errors.push({
        line,
        message: `Expected 5 or 6 fields (studentId, subject, term, score, grade, class), got ${parts.length}`,
        value: trimmed,
      });
      continue;
    }

    const [studentId, subject, term, scoreStr, grade] = parts;

    // Validate studentId
    if (!studentId || studentId.length === 0) {
      errors.push({
        line,
        message: 'Student ID cannot be empty',
        value: trimmed,
      });
      continue;
    }

    // Validate subject
    if (!subject || subject.length === 0) {
      errors.push({
        line,
        message: 'Subject cannot be empty',
        value: trimmed,
      });
      continue;
    }

    // Validate term
    if (!term || !term.match(/^Term\s*\d+$|^T\d+$/i)) {
      errors.push({
        line,
        message: `Invalid term: "${term}" (expected format: "Term 1", "T1", etc.)`,
        value: trimmed,
      });
      continue;
    }

    // Validate score
    const score = parseFloat(scoreStr);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.push({
        line,
        message: `Invalid score: "${scoreStr}" (must be a number between 0-100)`,
        value: trimmed,
      });
      continue;
    }

    // Validate grade
    if (!validGrades.includes(grade.toUpperCase())) {
      errors.push({
        line,
        message: `Invalid grade: "${grade}" (valid grades: ${validGrades.join(', ')})`,
        value: trimmed,
      });
      continue;
    }

    records.push({
      studentId,
      subject,
      term,
      score,
      grade: grade.toUpperCase(),
    });
  }

  return {
    isValid: errors.length === 0,
    records: errors.length === 0 ? records : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}
