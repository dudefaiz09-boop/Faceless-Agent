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
 * Expected format: studentId, amountDue, yyyy-mm-dd
 */
export function validateFeesCSV(csvText: string): ValidationResult<{
  studentId: string;
  amountDue: number;
  dueDate: string;
}> {
  const lines = csvText.split('\n').filter(l => l.trim() !== '');
  const errors: CSVValidationError[] = [];
  const records = [];

  for (let i = 0; i < lines.length; i++) {
    const line = i + 1; // 1-indexed for user messages
    const trimmed = lines[i].trim();

    if (!trimmed) continue;

    const parts = trimmed.split(',').map(s => s.trim());

    // Check field count
    if (parts.length !== 3) {
      errors.push({
        line,
        message: `Expected 3 fields (studentId, amountDue, dueDate), got ${parts.length}`,
        value: trimmed
      });
      continue;
    }

    const [studentId, amountDueStr, dueDate] = parts;

    // Validate studentId
    if (!studentId || studentId.length === 0) {
      errors.push({
        line,
        message: 'Student ID cannot be empty',
        value: trimmed
      });
      continue;
    }

    // Validate amountDue
    const amountDue = parseFloat(amountDueStr);
    if (isNaN(amountDue) || amountDue <= 0) {
      errors.push({
        line,
        message: `Invalid amount due: "${amountDueStr}" (must be a positive number)`,
        value: trimmed
      });
      continue;
    }

    // Validate date format (yyyy-mm-dd)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate)) {
      errors.push({
        line,
        message: `Invalid date format: "${dueDate}" (expected yyyy-mm-dd)`,
        value: trimmed
      });
      continue;
    }

    // Validate date is valid
    const dateObj = new Date(dueDate);
    if (isNaN(dateObj.getTime())) {
      errors.push({
        line,
        message: `Invalid date: "${dueDate}" is not a valid date`,
        value: trimmed
      });
      continue;
    }

    records.push({
      studentId,
      amountDue,
      dueDate
    });
  }

  return {
    isValid: errors.length === 0,
    records: errors.length === 0 ? records : undefined,
    errors: errors.length > 0 ? errors : undefined
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
  const lines = csvText.split('\n').filter(l => l.trim() !== '');
  const errors: CSVValidationError[] = [];
  const records = [];
  const validGrades = ['A', 'B', 'C', 'D', 'F', 'A+', 'A-', 'B+', 'B-', 'C+', 'C-'];

  for (let i = 0; i < lines.length; i++) {
    const line = i + 1; // 1-indexed for user messages
    const trimmed = lines[i].trim();

    if (!trimmed) continue;

    const parts = trimmed.split(',').map(s => s.trim());

    // Check field count
    if (parts.length !== 5) {
      errors.push({
        line,
        message: `Expected 5 fields (studentId, subject, term, score, grade), got ${parts.length}`,
        value: trimmed
      });
      continue;
    }

    const [studentId, subject, term, scoreStr, grade] = parts;

    // Validate studentId
    if (!studentId || studentId.length === 0) {
      errors.push({
        line,
        message: 'Student ID cannot be empty',
        value: trimmed
      });
      continue;
    }

    // Validate subject
    if (!subject || subject.length === 0) {
      errors.push({
        line,
        message: 'Subject cannot be empty',
        value: trimmed
      });
      continue;
    }

    // Validate term
    if (!term || !term.match(/^Term\s*\d+$|^T\d+$/i)) {
      errors.push({
        line,
        message: `Invalid term: "${term}" (expected format: "Term 1", "T1", etc.)`,
        value: trimmed
      });
      continue;
    }

    // Validate score
    const score = parseFloat(scoreStr);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.push({
        line,
        message: `Invalid score: "${scoreStr}" (must be a number between 0-100)`,
        value: trimmed
      });
      continue;
    }

    // Validate grade
    if (!validGrades.includes(grade.toUpperCase())) {
      errors.push({
        line,
        message: `Invalid grade: "${grade}" (valid grades: ${validGrades.join(', ')})`,
        value: trimmed
      });
      continue;
    }

    records.push({
      studentId,
      subject,
      term,
      score,
      grade: grade.toUpperCase()
    });
  }

  return {
    isValid: errors.length === 0,
    records: errors.length === 0 ? records : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}
