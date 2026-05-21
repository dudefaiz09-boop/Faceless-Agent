# Permission Matrix

| Module        | View                                          | Manage                              | Tenant dependency         |
| ------------- | --------------------------------------------- | ----------------------------------- | ------------------------- |
| dashboard     | enrolled roles                                | admin/teacher scoped cards          | tenant profile            |
| announcements | assigned roles/classes                        | `manageAnnouncements`/admin         | tenant + class targets    |
| attendance    | student self, linked parent, teacher/admin    | `markAttendance`/admin              | tenant + class            |
| assignments   | student/parent/teacher/admin                  | `manageAssignments`/admin           | tenant + class            |
| chat/AI       | assigned module                               | tenant AI config/admin              | tenant + AI availability  |
| library       | assigned roles                                | `manageLibrary`/librarian/admin     | tenant                    |
| fees          | student self, linked parent, accountant/admin | `manageFees`/accountant/admin       | tenant + class            |
| performance   | student self, linked parent, teacher/admin    | `managePerformance`/`viewReports`   | tenant + class/student    |
| users         | admin/super admin                             | admin/super admin                   | tenant + managedTenantIds |
| roles         | admin/super admin                             | super admin for global role changes | tenant                    |
| students      | assigned staff/parent/student self            | admin/teacher scoped                | tenant + class            |
| teachers      | admin/teacher directory                       | admin                               | tenant                    |
| notifications | target user                                   | system/admin bulk send              | tenant + target           |

Backend helpers added in `apps/functions/src/middleware/permissions.ts`:

- `requirePermission`
- `requireAnyPermission`
- `requireRole`
- `requireAnyRole`
- `requireModuleAccess`
- `requireStudentSelfOrLinkedParent`
- `requireClassAccess`
- `requireTenantAdmin`
- `requireSuperAdmin`
