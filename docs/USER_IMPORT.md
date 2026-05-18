# Enterprise User Import (CSV)

EduConnect supports bulk user provisioning via CSV import in the Users module.

## CSV Structure

The CSV file must contain a header row with the following fields:

| Header             | Required | Description                                                                                       |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `email`            | Yes      | Unique identifier for the user.                                                                   |
| `displayName`      | Yes      | User's full name.                                                                                 |
| `role`             | Yes      | One of: `student`, `teacher`, `principal`, `parent`, `librarian`, `accountant`, `admin`, `staff`. |
| `password`         | Yes      | Initial password for the account.                                                                 |
| `classIds`         | No       | Semicolon-separated list of class IDs (e.g., `A1;A2`).                                            |
| `subjectIds`       | No       | Semicolon-separated list of subject IDs.                                                          |
| `linkedStudentIds` | No       | Semicolon-separated list of student emails (for parents).                                         |
| `tenantId`         | No       | Target school ID. Defaults to the selected school in the UI.                                      |

## Import Process

1. **Get Template:** Download the CSV template from the Users module.
2. **Fill Data:** Populate the CSV with user records.
3. **Select School:** (Super Admin only) Choose the default target school for the import.
4. **Upload & Preview:** Upload the file to see a preview of the records.
5. **Execute:** Confirm the import to create accounts and profiles.

## Role & Permission Mapping

Users created via bulk import are automatically assigned default permissions and modules based on their role.

- **Student:** Dashboard, Attendance, Assignments, Fees, Performance, Library, Chat.
- **Teacher:** Dashboard, AI Assistant, Attendance, Assignments, Students, Performance, Library, Announcements, Chat.
- **Admin:** All modules and full system permissions.
