create index if not exists documents_assignments_tenant_class_due_idx
on public.documents (
  (data ->> 'tenantId'),
  (data ->> 'classId'),
  (data ->> 'dueDate')
)
where collection = 'assignments';

create index if not exists documents_submissions_tenant_assignment_student_idx
on public.documents (
  (data ->> 'tenantId'),
  (data ->> 'assignmentId'),
  (data ->> 'studentId')
)
where collection = 'submissions';

create index if not exists documents_attendance_tenant_class_student_date_idx
on public.documents (
  (data ->> 'tenantId'),
  (data ->> 'classId'),
  (data ->> 'studentId'),
  (data ->> 'date')
)
where collection = 'attendance';

create index if not exists documents_fees_tenant_class_student_status_idx
on public.documents (
  (data ->> 'tenantId'),
  (data ->> 'classId'),
  (data ->> 'studentId'),
  (data ->> 'status')
)
where collection = 'fees';

create index if not exists documents_payments_tenant_student_fee_idx
on public.documents ((data ->> 'tenantId'), (data ->> 'studentId'), (data ->> 'feeId'))
where collection = 'payments';

create index if not exists documents_users_tenant_role_status_idx
on public.documents ((data ->> 'tenantId'), (data ->> 'role'), (data ->> 'status'))
where collection = 'users';

create index if not exists documents_notifications_tenant_user_created_idx
on public.documents ((data ->> 'tenantId'), (data ->> 'userId'), (data ->> 'createdAt'))
where collection = 'notifications';

create index if not exists documents_library_books_tenant_status_idx
on public.documents ((data ->> 'tenantId'), (data ->> 'status'), (data ->> 'createdAt'))
where collection in ('library', 'library_books');

create index if not exists documents_performance_tenant_class_student_idx
on public.documents ((data ->> 'tenantId'), (data ->> 'classId'), (data ->> 'studentId'))
where collection = 'performance_records';

create index if not exists documents_data_target_classes_gin_idx
on public.documents using gin ((data -> 'targetClasses'))
where collection = 'assignments';

create index if not exists documents_data_linked_students_gin_idx
on public.documents using gin ((data -> 'linkedStudentIds'))
where collection = 'users';
