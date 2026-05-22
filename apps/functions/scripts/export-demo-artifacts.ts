import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outputDir = join(process.cwd(), '../../audit/generated');

const tenants = [
  { id: 'tenant-a', name: 'EduConnect Demo Academy' },
  { id: 'tenant-b', name: 'EduConnect International School' },
];

const accountRows = [
  ['tenant-a', 'admin', 'admin.demo1@educonnect.test', 'Tenant admin QA'],
  ['tenant-a', 'principal', 'principal.demo1@educonnect.test', 'Leadership/reporting QA'],
  ['tenant-a', 'teacher', 'teacher.math.demo1@educonnect.test', 'Assignments/attendance QA'],
  ['tenant-a', 'teacher', 'teacher.english.demo1@educonnect.test', 'Secondary class coverage'],
  ['tenant-a', 'student', 'student.a.demo1@educonnect.test', 'Paid fees/graded submission QA'],
  ['tenant-a', 'student', 'student.b.demo1@educonnect.test', 'Pending fees/submitted assignment QA'],
  ['tenant-a', 'parent', 'parent.a.demo1@educonnect.test', 'Linked-child parent portal QA'],
  ['tenant-a', 'librarian', 'librarian.demo1@educonnect.test', 'Library QA'],
  ['tenant-a', 'accountant', 'accountant.demo1@educonnect.test', 'Fees QA'],
  ['tenant-b', 'admin', 'admin.demo2@educonnect.test', 'Tenant admin QA'],
  ['tenant-b', 'principal', 'principal.demo2@educonnect.test', 'Leadership/reporting QA'],
  ['tenant-b', 'teacher', 'teacher.math.demo2@educonnect.test', 'Assignments/attendance QA'],
  ['tenant-b', 'student', 'student.a.demo2@educonnect.test', 'Paid fees/graded submission QA'],
  ['tenant-b', 'student', 'student.b.demo2@educonnect.test', 'Pending fees/submitted assignment QA'],
  ['tenant-b', 'parent', 'parent.a.demo2@educonnect.test', 'Linked-child parent portal QA'],
  ['tenant-b', 'librarian', 'librarian.demo2@educonnect.test', 'Library QA'],
  ['tenant-b', 'accountant', 'accountant.demo2@educonnect.test', 'Fees QA'],
  ['global', 'admin', 'admin@educonnect.test', 'Cross-tenant switcher QA'],
];

const feeImportRows = [
  ['school_id', 'student_email', 'student_id', 'label', 'amount', 'amount_paid', 'due_date', 'status'],
  ['tenant-a', 'student.a.demo1@educonnect.test', 'stu-a-001', 'Tuition Fee Term 2', '25000', '0', '2026-08-15', 'pending'],
  ['tenant-a', 'student.b.demo1@educonnect.test', 'stu-a-002', 'Library Fine', '250', '0', '2026-07-10', 'pending'],
  ['tenant-b', 'student.a.demo2@educonnect.test', 'stu-b-001', 'Transport Fee', '12000', '12000', '2026-08-20', 'paid'],
];

const libraryImportRows = [
  ['school_id', 'title', 'subject', 'grade', 'type', 'available_copies', 'visibility', 'target_class_ids'],
  ['tenant-a', 'Physics Lab Manual', 'Science', '10', 'document', '6', 'classes', 'A1|A2'],
  ['tenant-a', 'English Grammar Builder', 'English', '10', 'document', '4', 'classes', 'A2'],
  ['tenant-b', 'Python Basics Workbook', 'Computer Science', '9', 'document', '8', 'classes', 'B1|B2'],
];

function csv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    )
    .join('\n');
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  await writeFile(join(outputDir, 'demo-account-matrix.csv'), csv([
    ['tenant_id', 'role', 'email', 'purpose'],
    ...accountRows,
  ]));

  await writeFile(join(outputDir, 'fees-import-sample.csv'), csv(feeImportRows));
  await writeFile(join(outputDir, 'library-import-sample.csv'), csv(libraryImportRows));

  await writeFile(
    join(outputDir, 'demo-tenants.json'),
    `${JSON.stringify({ tenants, generatedAt: new Date().toISOString() }, null, 2)}\n`
  );

  console.log(`Generated demo artifacts in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
