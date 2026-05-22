import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputDir = join(process.cwd(), 'audit/generated');

const rows = [
  ['area', 'role', 'tenant', 'scenario', 'expected_result', 'priority'],
  ['All Users', 'global_admin', 'tenant-a/tenant-b', 'Switch tenant from admin view', 'Only selected tenant records are visible', 'critical'],
  ['All Users', 'admin', 'tenant-a', 'Open add user modal', 'Modal is centered, readable, and usable on desktop and mobile widths', 'critical'],
  ['All Users', 'admin', 'tenant-a', 'Update user profile and role', 'Changes persist and role/module visibility updates correctly', 'critical'],
  ['Dark Mode', 'all_roles', 'tenant-a', 'Review form fields and cards', 'Text is readable without selecting or highlighting fields', 'critical'],
  ['Assignments', 'teacher', 'tenant-a', 'Load assignment list for class with assignments', 'Assignments render with due dates, states, and submission counts', 'critical'],
  ['Assignments', 'teacher', 'tenant-a', 'Load empty class assignment list', 'Empty state appears instead of crash or fatal error', 'high'],
  ['Assignments', 'student', 'tenant-a', 'Open assigned work and submission state', 'Student sees eligible assignments and submission state', 'high'],
  ['Fees', 'accountant', 'tenant-a', 'Download sample import CSV', 'CSV downloads with required headers and sample rows', 'high'],
  ['Fees', 'accountant', 'tenant-a', 'Import fees from CSV file', 'Rows validate and import without blocking the UI', 'critical'],
  ['Fees', 'parent', 'tenant-a', 'View linked child fees', 'Only linked child fee records are visible', 'critical'],
  ['Library', 'librarian', 'tenant-a', 'Issue and return book or resource', 'Borrow status and counts update correctly', 'high'],
  ['Library', 'librarian', 'tenant-a', 'Verify overdue state', 'Overdue records are visible and actionable', 'medium'],
  ['Parent Portal', 'parent', 'tenant-a', 'Review linked child data', 'Attendance, assignments, fees, and performance match linked children only', 'critical'],
  ['Chat', 'teacher', 'tenant-a', 'Start chat with eligible contact', 'Only allowed school contacts are available', 'high'],
  ['Mobile Web Width', 'all_roles', 'tenant-a', 'Open dashboard at mobile width', 'Navigation and primary actions remain reachable', 'medium'],
];

function csv(values: string[][]) {
  return values
    .map((row) =>
      row
        .map((value) => (value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value))
        .join(',')
    )
    .join('\n');
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'web-product-qa-matrix.csv');
  await writeFile(outputPath, `${csv(rows)}\n`);
  console.log(`Generated ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
