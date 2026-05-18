# Demo Data Overview

## Tenants
| ID | Name | Slug | City | Board |
|----|------|------|------|-------|
| tenant-a | School A | school-a | Pune | CBSE |
| tenant-b | School B | school-b | Mumbai | ICSE |
| tenant-c | School C | school-c | Bengaluru | State Board |

## Seeded Modules
### 1. Attendance
- 7 days of historical data for all students in all 3 tenants.
- Mixed statuses: Present, Absent, Late.

### 2. Assignments & Submissions
- **School A:** Algebra Practice (Math), Reading Reflection (English).
- **School B:** CS Basics Quiz (Computer Science).
- **School C:** Science Lab Report (Science).
- Submissions seeded for all students with grades and feedback.

### 3. Fees
- Tuition Fees and Library Fees seeded for all students.
- Mixed payment statuses: Paid, Pending.

### 4. Users
- 18+ user accounts across 8 roles.
- Role-based permissions and module access.
- Multi-tenant memberships for the super admin.

## AI Assistant Scenarios
- **Student:** "Was I present yesterday?", "Show my pending assignments."
- **Parent:** "How is my child doing in Math?", "Show my children's fee balances."
- **Teacher:** "Which students in my class are absent today?", "Summarize submissions for Algebra Practice."
- **Principal:** "Give me a school-wide attendance summary.", "Show fee collection status."
- **Admin:** Switch between schools and ask tenant-scoped questions.
