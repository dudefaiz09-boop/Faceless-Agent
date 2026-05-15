# Testing and Validation Guide

## Build Validation Commands

Run these commands to validate the build:

```bash
# Enable corepack (may require admin/sudo)
corepack enable

# Install dependencies
pnpm install

# Build backend functions
pnpm --filter @educonnect/functions build

# Build frontend web app
pnpm --filter @educonnect/web build

# Run tests (if available)
pnpm test
```

## Expected Build Results

### Successful Build Indicators

- ✅ No TypeScript compilation errors
- ✅ No ESLint errors (warnings are acceptable)
- ✅ All packages build successfully
- ✅ Build artifacts created in dist/ directories
- ✅ No missing dependency errors

### Known Non-Critical Issues

- TypeScript IDE warnings in VSCode (cosmetic only)
- Missing @types/node in some packages (doesn't affect runtime)
- Monorepo path resolution warnings (resolved at build time)

## Manual Testing Checklist

### Part 1: AI Assistant Testing

#### As Admin/Teacher/Student

- [ ] Navigate to /chatbot
- [ ] Verify AI status indicator shows correct mode (live/offline)
- [ ] Send test query: "What is EduConnect?"
- [ ] Verify response (live or fallback)
- [ ] Check that query is not cleared on failure
- [ ] Verify no raw error messages shown to students

#### As Student (Offline Mode)

- [ ] Verify friendly message: "AI is using safe offline mode"
- [ ] Verify no environment variable instructions shown

#### As Admin (Offline Mode)

- [ ] Verify setup warning with OPENROUTER_API_KEY guidance
- [ ] Verify instructions to add key to Vercel/deployment

### Part 2: Notifications Testing

#### Notification Overlay

- [ ] Click notification bell icon
- [ ] Verify dropdown appears ABOVE all content (z-index 300)
- [ ] Verify dropdown not hidden behind dashboard/modules
- [ ] Click outside dropdown - verify it closes
- [ ] Press Escape key - verify it closes

#### Notification Actions

- [ ] Create test announcement (as admin/teacher)
- [ ] Verify notification appears for target users
- [ ] Verify unread badge shows correct count
- [ ] Click "Mark all as read"
- [ ] Verify badge becomes 0
- [ ] Refresh page - verify read state persists
- [ ] Delete a notification
- [ ] Verify it's removed from list

#### Notification Triggers

- [ ] Create announcement - verify notification sent
- [ ] Mark attendance - verify student/parent notified
- [ ] Upload fee CSV - verify student/parent notified
- [ ] Upload library resource - verify target class notified
- [ ] Publish assignment - verify target class notified

### Part 3: Assignments Testing

#### Page Load

- [ ] Navigate to /assignments as student
- [ ] Verify page loads without ErrorBoundary crash
- [ ] Navigate to /assignments as teacher
- [ ] Verify page loads without ErrorBoundary crash
- [ ] Navigate to /assignments as principal
- [ ] Verify page loads without ErrorBoundary crash

#### Student View

- [ ] Verify only own class assignments visible
- [ ] Verify assignment title, description, due date display
- [ ] Verify submission status shows correctly
- [ ] Submit an assignment
- [ ] Verify submission success toast
- [ ] Verify assignment status updates

#### Teacher View

- [ ] Create assignment for assigned class
- [ ] Verify assignment appears for target students
- [ ] View submissions
- [ ] Grade a submission
- [ ] Verify student receives grade notification

#### Parent View

- [ ] Verify can view linked student's assignments (read-only)
- [ ] Verify cannot submit assignments
- [ ] Verify cannot create assignments

#### Error Handling

- [ ] Test with missing assignment data
- [ ] Verify graceful fallback (no full app crash)
- [ ] Verify error message shown at module level

### Part 4: Chat Eligibility Testing

#### Student Chat

- [ ] Open chat as student
- [ ] Verify contact list shows:
  - ✅ Assigned class teachers
  - ✅ Principal
  - ✅ Admin (if enabled)
  - ❌ Other students
  - ❌ Unassigned teachers
  - ❌ Librarian
  - ❌ Accountant
- [ ] Start conversation with assigned teacher
- [ ] Verify conversation created successfully
- [ ] Try manual API call to message unauthorized user
- [ ] Verify 403 Forbidden response

#### Parent Chat

- [ ] Open chat as parent
- [ ] Verify contact list shows:
  - ✅ Linked child's teachers
  - ✅ Principal
  - ✅ Admin (if enabled)
  - ❌ Other parents
  - ❌ Students
  - ❌ Unassigned teachers
- [ ] Start conversation with child's teacher
- [ ] Verify conversation created successfully

#### Teacher Chat

- [ ] Open chat as teacher
- [ ] Verify contact list shows:
  - ✅ Students in assigned classes
  - ✅ Parents of assigned students
  - ✅ Principal
  - ✅ Admin
  - ❌ Students outside assigned classes
  - ❌ Parents of unassigned students
- [ ] Message student in assigned class
- [ ] Verify message sent successfully

#### Contact Display

- [ ] Verify contact cards show:
  - Name
  - Role
  - Class/subject (where applicable)
  - Reason (e.g., "Class Teacher", "Principal")

### Part 5: Library Testing

#### Upload Types

- [ ] As librarian, navigate to /library
- [ ] Click upload button
- [ ] Verify upload type selector shows:
  - Upload PDF/eBook from device
  - Add web link
  - Add document attachment
- [ ] Upload PDF file from device
- [ ] Verify file upload succeeds
- [ ] Verify attachment icon/name shown
- [ ] Add web link resource
- [ ] Verify external URL saved

#### Class-Wise Visibility

- [ ] Upload resource for specific class (e.g., 10A)
- [ ] Login as student in 10A
- [ ] Verify resource visible
- [ ] Login as student in 10B
- [ ] Verify resource NOT visible
- [ ] Upload resource for "all"
- [ ] Verify all students see it

#### Role Restrictions

- [ ] As student, verify cannot upload resources
- [ ] As parent, verify cannot upload resources
- [ ] As librarian, verify can upload resources
- [ ] As admin, verify can upload resources

#### Notifications

- [ ] Upload resource for class
- [ ] Verify target class students receive notification
- [ ] Verify parents of target class receive notification

### Part 6: Fees Testing

#### CSV File Upload

- [ ] As accountant, navigate to /fees
- [ ] Verify upload mode selector (paste vs file)
- [ ] Click file upload button
- [ ] Select .csv file
- [ ] Verify file validation (must be .csv)
- [ ] Verify CSV content parsed
- [ ] Verify preview shown before submit
- [ ] Submit CSV
- [ ] Verify success toast

#### INR Currency Display

- [ ] Verify all amounts show ₹ symbol (not $)
- [ ] Verify amounts formatted with locale (e.g., ₹1,234.56)
- [ ] Check fee table columns
- [ ] Check payment success toast
- [ ] Check fee cards/summaries

#### Student/Parent Sync

- [ ] Upload fee for student
- [ ] Login as that student
- [ ] Verify fee appears in fees page
- [ ] Verify notification received
- [ ] Login as linked parent
- [ ] Verify can see student's fee
- [ ] Verify parent received notification

#### Class-Wise Import

- [ ] Select class from dropdown
- [ ] Upload CSV for that class
- [ ] Verify only students in that class affected
- [ ] Verify duplicate upload updates existing record (no duplicates)

### Part 7: Class-Wise Sync Testing

#### Announcements Sync

- [ ] As teacher, create announcement for class 10A
- [ ] Verify "Last synced" indicator updates
- [ ] Login as student in 10A
- [ ] Verify announcement appears
- [ ] Click refresh button
- [ ] Verify sync timestamp updates
- [ ] Verify "Realtime enabled" badge shown

#### Attendance Sync

- [ ] As teacher, mark attendance for class
- [ ] Verify "Last synced" indicator updates
- [ ] Login as student
- [ ] Verify attendance record appears
- [ ] Login as parent
- [ ] Verify can see linked child's attendance
- [ ] Click refresh button
- [ ] Verify data updates

#### Assignments Sync

- [ ] Teacher publishes assignment
- [ ] Student sees assignment immediately (or after refresh)
- [ ] Student submits assignment
- [ ] Teacher sees submission immediately (or after refresh)
- [ ] Verify sync status indicator

#### Fees Sync

- [ ] Accountant uploads fee CSV
- [ ] Student sees updated fee
- [ ] Parent sees linked child's fee
- [ ] Verify notification sent to both

#### Library Sync

- [ ] Librarian uploads resource for class
- [ ] Target class students see resource
- [ ] Other class students don't see resource
- [ ] Verify notification sent

### Part 8: Role/Module Access Testing

#### Student Access

- [ ] Try to access /all-users by URL
- [ ] Verify access denied page shown (not 404)
- [ ] Try to access /teachers by URL
- [ ] Verify access denied page shown
- [ ] Try POST /api/library/upload via API
- [ ] Verify 403 Forbidden response
- [ ] Verify sidebar only shows allowed modules

#### Parent Access

- [ ] Try to access /students by URL
- [ ] Verify access denied page shown
- [ ] Try to access /teachers by URL
- [ ] Verify access denied page shown
- [ ] Try POST /api/assignments via API
- [ ] Verify 403 Forbidden response
- [ ] Verify can only view linked child's data

#### Teacher Access

- [ ] Try to access /all-users by URL
- [ ] Verify access denied page shown
- [ ] Try to access /fees by URL
- [ ] Verify access denied page shown
- [ ] Verify can mark attendance for assigned classes only
- [ ] Verify can create assignments for assigned classes only

#### Librarian Access

- [ ] Try to access /fees by URL
- [ ] Verify access denied page shown
- [ ] Try POST /api/fees/upload via API
- [ ] Verify 403 Forbidden response
- [ ] Verify can upload library resources
- [ ] Verify limited chat access

#### Accountant Access

- [ ] Try to access /library by URL
- [ ] Verify access denied page shown
- [ ] Try POST /api/library/upload via API
- [ ] Verify 403 Forbidden response
- [ ] Verify can upload fee CSV
- [ ] Verify limited chat access

### Part 9: UI Polish Testing

#### Sidebar/Footer

- [ ] Scroll through long navigation menu
- [ ] Verify Sign Out button always visible at bottom
- [ ] Verify no overlap between nav items and Sign Out
- [ ] Test on mobile - verify sidebar collapses
- [ ] Test mobile menu overlay
- [ ] Verify backdrop blur works

#### Loading States

- [ ] Navigate between pages
- [ ] Verify loading spinner shows during page load
- [ ] Submit forms
- [ ] Verify button shows loading state during submission
- [ ] Verify loading text changes (e.g., "Saving...")

#### Empty States

- [ ] View page with no data (e.g., no announcements)
- [ ] Verify empty state shows icon, title, description
- [ ] Verify action button present (e.g., "Create Announcement")
- [ ] Click action button
- [ ] Verify appropriate modal/form opens

#### Mobile Responsiveness

- [ ] Test on mobile viewport (375px width)
- [ ] Verify sidebar collapses to hamburger menu
- [ ] Verify grids stack vertically
- [ ] Verify buttons are touch-friendly (min 44px)
- [ ] Verify text remains readable
- [ ] Verify no horizontal scroll

#### Theme Consistency

- [ ] Check all pages use consistent rounded corners
- [ ] Check all pages use consistent shadows
- [ ] Check all pages use consistent color palette
- [ ] Toggle dark mode
- [ ] Verify all pages work in dark mode

### Part 10: Error Handling Testing

#### Network Errors

- [ ] Disconnect network
- [ ] Try to load data
- [ ] Verify error message shown
- [ ] Verify retry button available
- [ ] Reconnect network
- [ ] Click retry
- [ ] Verify data loads

#### Invalid Data

- [ ] Submit form with invalid data
- [ ] Verify validation errors shown
- [ ] Verify errors clear after fixing
- [ ] Submit form with missing required fields
- [ ] Verify appropriate error messages

#### Permission Errors

- [ ] Try unauthorized action
- [ ] Verify 403 error handled gracefully
- [ ] Verify user-friendly error message
- [ ] Verify no stack traces shown to users

## Automated Test Results

If `pnpm test` is available, document results here:

```
Test Suites: X passed, X total
Tests:       X passed, X total
Snapshots:   X total
Time:        Xs
```

## Known Limitations

Document any known limitations or issues:

1. **TypeScript IDE Warnings**: Cosmetic warnings in VSCode that don't affect runtime
2. **CSV Template Downloads**: Partially implemented, needs UI exposure in some pages
3. **Import Preview**: Needs enhancement for file uploads
4. **Offline AI Mode**: Provides fallback responses, not full AI functionality

## Production Readiness Checklist

- [ ] All builds complete successfully
- [ ] No critical errors in console
- [ ] All manual tests pass
- [ ] Role-based access working correctly
- [ ] Notifications working correctly
- [ ] Class-wise sync working correctly
- [ ] Mobile responsive
- [ ] Dark mode working
- [ ] Error handling graceful
- [ ] Loading states present
- [ ] Empty states present

## Deployment Validation

After deploying to production:

1. **Verify Environment Variables**
   - [ ] OPENROUTER_API_KEY set (if using AI)
   - [ ] OPENROUTER_MODEL set
   - [ ] PUBLIC_APP_URL set
   - [ ] CURRENCY set to INR
   - [ ] Supabase credentials set
   - [ ] All other required env vars set

2. **Smoke Test**
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] Can navigate between pages
   - [ ] Can create/read/update data
   - [ ] Notifications work
   - [ ] Real-time updates work

3. **Performance**
   - [ ] Page load time < 3s
   - [ ] Time to interactive < 5s
   - [ ] No memory leaks
   - [ ] No console errors

## Test Results Summary

Date: ******\_\_\_******
Tester: ******\_\_\_******
Environment: ******\_\_\_******

| Test Category      | Status            | Notes |
| ------------------ | ----------------- | ----- |
| Build              | ⬜ Pass / ⬜ Fail |       |
| AI Assistant       | ⬜ Pass / ⬜ Fail |       |
| Notifications      | ⬜ Pass / ⬜ Fail |       |
| Assignments        | ⬜ Pass / ⬜ Fail |       |
| Chat Eligibility   | ⬜ Pass / ⬜ Fail |       |
| Library            | ⬜ Pass / ⬜ Fail |       |
| Fees               | ⬜ Pass / ⬜ Fail |       |
| Class-Wise Sync    | ⬜ Pass / ⬜ Fail |       |
| Role/Module Access | ⬜ Pass / ⬜ Fail |       |
| UI Polish          | ⬜ Pass / ⬜ Fail |       |
| Error Handling     | ⬜ Pass / ⬜ Fail |       |

**Overall Status**: ⬜ Ready for Production / ⬜ Needs Work

**Critical Issues**: ******\_\_\_******

**Non-Critical Issues**: ******\_\_\_******

**Recommendations**: ******\_\_\_******
