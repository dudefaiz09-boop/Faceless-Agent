/**
 * CSV Validation and Parsing Utilities
 */

export interface CSVValidationError {
  line: number;
  message: string;
  value: string;
}

export interface CSVRecord {
  studentId: string;
  amountDue: number;
  dueDate: string;
}

/**
 * Validates fee CSV format: studentId, amountDue, dueDate (YYYY-MM-DD)
 */
export function validateFeesCSV(csv: string): { 
  isValid: boolean; 
  records?: CSVRecord[]; 
  errors?: CSVValidationError[] 
} {
  const errors: CSVValidationError[] = [];
  const records: CSVRecord[] = [];
  
  const lines = csv.split('\n').filter(l => l.trim() !== '');
  
  if (lines.length === 0) {
    return { isValid: false, errors: [{ line: 0, message: 'CSV is empty', value: '' }] };
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const parts = line.split(',').map(s => s.trim());

    if (parts.length !== 3) {
      errors.push({ line: lineNumber, message: 'Expected 3 fields (studentId, amountDue, dueDate)', value: line });
      return;
    }

    const [studentId, amountStr, dueDate] = parts;

    // Validate studentId (non-empty)
    if (!studentId) {
      errors.push({ line: lineNumber, message: 'Student ID cannot be empty', value: line });
      return;
    }

    // Validate amountDue (positive number)
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      errors.push({ line: lineNumber, message: 'Amount must be a positive number', value: line });
      return;
    }

    // Validate dueDate (YYYY-MM-DD format)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate)) {
      errors.push({ line: lineNumber, message: 'Due date must be in YYYY-MM-DD format', value: line });
      return;
    }

    // Additional: Check if date is valid
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      errors.push({ line: lineNumber, message: 'Invalid date value', value: line });
      return;
    }

    records.push({ studentId, amountDue: amount, dueDate });
  });

  return {
    isValid: errors.length === 0,
    records: errors.length === 0 ? records : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validates performance CSV format: studentId, subject, term, score, grade
 */
export function validatePerformanceCSV(csv: string): { 
  isValid: boolean; 
  records?: any[]; 
  errors?: CSVValidationError[] 
} {
  const errors: CSVValidationError[] = [];
  const records: any[] = [];
  
  const lines = csv.split('\n').filter(l => l.trim() !== '');
  
  if (lines.length === 0) {
    return { isValid: false, errors: [{ line: 0, message: 'CSV is empty', value: '' }] };
  }

  const validGrades = ['A', 'B', 'C', 'D', 'F'];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const parts = line.split(',').map(s => s.trim());

    if (parts.length !== 5) {
      errors.push({ line: lineNumber, message: 'Expected 5 fields (studentId, subject, term, score, grade)', value: line });
      return;
    }

    const [studentId, subject, term, scoreStr, grade] = parts;

    // Validate studentId
    if (!studentId) {
      errors.push({ line: lineNumber, message: 'Student ID cannot be empty', value: line });
      return;
    }

    // Validate subject
    if (!subject) {
      errors.push({ line: lineNumber, message: 'Subject cannot be empty', value: line });
      return;
    }

    // Validate term
    if (!term || !term.match(/^Term\s*\d+$/i)) {
      errors.push({ line: lineNumber, message: 'Term must be in format "Term 1", "Term 2", etc.', value: line });
      return;
    }

    // Validate score (0-100)
    const score = parseFloat(scoreStr);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.push({ line: lineNumber, message: 'Score must be a number between 0-100', value: line });
      return;
    }

    // Validate grade
    if (!validGrades.includes(grade.toUpperCase())) {
      errors.push({ line: lineNumber, message: `Grade must be one of: ${validGrades.join(', ')}`, value: line });
      return;
    }

    records.push({ studentId, subject, term, score, grade: grade.toUpperCase() });
  });

  return {
    isValid: errors.length === 0,
    records: errors.length === 0 ? records : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}
