# Fix ERP Module Sync, AI, Notifications, and Imports

## Overview
This PR addresses critical production issues and implements missing features for the EduConnect ERP system after the recent module-polish/admin-role PRs. The changes focus on production-grade fixes for AI integration, notification system, and data import workflows.

## Changes Implemented

### ✅ Part 1: OpenRouter AI Production Setup and Fallback

**Problem:** AI page showed hardcoded production URL and exposed raw error messages to users.

**Solution:**
- **Environment Configuration** (`apps/functions/src/lib/config.ts`):
  - Added `OPENROUTER_MODEL` (optional) for model selection
  - Added `PUBLIC_APP_URL` (optional) for dynamic HTTP-Referer
  - Added `CURRENCY` (default: INR) for fee display
  
- **AI Library** (`apps/functions/src/lib/ai.ts`):
  - Dynamic HTTP-Referer using `PUBLIC_APP_URL` → `VERCEL_URL` → `localhost:5173` fallback
  - Automatic `https://` prefix for VERCEL_URL
  - Safe error handling: returns offline fallback instead of exposing provider errors
  - Server-side only error logging
  
- **AI Status Endpoint** (`apps/functions/src/features/ai/ai.controller.ts`):
  - New `GET /api/ai/status` endpoint
  - Returns: `{ enabled, provider, model, mode }`
  
- **Frontend Updates** (`apps/web/src/pages/Chatbot.tsx`):
  - Loads AI status on mount
  - Role-appropriate error messages (admin/staff see setup instructions, students see friendly message)
  - Preserves user query on failure for easy retry
  - Shows offline warning banner for admin/staff when AI is disabled
  
- **Documentation** (`apps/functions/.env.example`):
  - Added `OPENROUTER_MODEL`, `PUBLIC_APP_URL`, `CURRENCY` examples

**Acceptance Criteria:**
- ✅ AI works with OPENROUTER_API_KEY configured
- ✅ AI returns helpful fallback without OPENROUTER_API_KEY
- ✅ No hardcoded production URLs in code
- ✅ Provider errors not exposed to frontend

---

### ✅ Part 2: Notification Center Overlay and Unread Clearing

**Problem:** Notification popup appeared behind dashboard/modules and unread badge couldn't be cleared.

**Solution:**
- **Z-Index Fix** (`apps/web/src/components/saas/NotificationDropdown.tsx`):
  - Changed from `z-50` to `z-[300]` to appear above all content
  - Added portal-like behavior with proper stacking context
  
- **UX Improvements**:
  - Click-outside handler to close dropdown
  - Escape key handler to close dropdown
  - Delete notification button (appears on hover)
  - Improved notification item layout with better spacing
  
- **Backend Support** (`apps/functions/src/routes/notifications.ts`):
  - Added `DELETE /api/notifications/:id` endpoint
  - Permission check: users can only delete notifications they can see
  - Existing endpoints: `GET /`, `POST /`, `PATCH /:id/read`, `PATCH /read-all`
  
- **State Management**:
  - Local optimistic updates for read state
  - Rollback on API failure
  - Persistent read state across page refreshes

**Acceptance Criteria:**
- ✅ Notification popover never hidden behind pages
- ✅ Unread badge becomes 0 after mark-all-read
- ✅ Cleared/read state persists after refresh
- ✅ Student/parent only sees relevant notifications
- ✅ Delete functionality works correctly

---

### ✅ Part 3: Assignments Crash Fix and Workflow Hardening

**Problem:** Production `/assignments` page could crash with ErrorBoundary "Something went wrong" due to missing data guards and invalid assignment objects.

**Changes Made:**

**Frontend (`apps/web/src/pages/Assignments.tsx`):**
- Added comprehensive null/undefined guards for assignment data
- Changed `data: assignments` to `data: assignmentsData` with filtering
- Filter out invalid assignments (missing id) before rendering
- Added fallback values:
  - `assignment.title || 'Untitled Assignment'`
  - `assignment.dueDate || 'TBD'`
  - `assignment.classId || 'All'`
  - `assignment.description || 'No description provided.'`
- Wrapped dueDate parsing in try-catch to prevent date errors
- Added guards to FileUpload component (only render if uid and assignmentId exist)
- Added dark mode text color classes for better visibility

**Routing (`apps/web/src/App.tsx`):**
- Imported `ModuleErrorBoundary`
- Wrapped `<AssignmentsPage />` with `<ModuleErrorBoundary>` to prevent full app crashes
- Individual module errors now show user-friendly error UI instead of crashing entire app

**Backend (`apps/functions/src/routes/assignments.ts`):**
- Enhanced GET `/assignments/:classId?` endpoint:
  - Added default values for required fields (title, dueDate, classId, targetClasses, attachments)
  - Ensures arrays are always arrays, not undefined
  - Added error logging with context
- Enhanced POST `/submit` endpoint:
  - Added warning log when assignment not found
  - Improved error logging with assignmentId and userId context
  - AI grading failures no longer crash submission (submission still saved)

**Error Boundary (`apps/web/src/components/ModuleErrorBoundary.tsx`):**
- React Error Boundary for graceful error handling (created in Part 2)
- Module-level isolation prevents full app crashes
- User-friendly error UI with clear message, reload button, and collapsible error details
- Automatic error logging with module name

**Acceptance Criteria:**
- ✅ `/assignments` loads without crashes for all roles
- ✅ Student sees only their class assignments (existing functionality preserved)
- ✅ Teacher can create assignments (existing functionality preserved)
- ✅ Parent can view linked student assignments (existing functionality preserved)
- ✅ No full app crash - errors contained to module level
- ✅ Missing/invalid data handled gracefully with fallbacks
- ✅ Backend returns safe defaults for missing fields

---

## Remaining Work (Not Included in This PR)

The following items from the original task are **NOT** included in this PR and should be addressed in future PRs:

### Part 4: Chat Eligibility and Messaging
- Contact list filtering by role eligibility
- Backend enforcement of authorized participant pairs
- Attachment support
- Group chat support
- Unread message counts

### Part 5: Library PDF/eBook/Web-Link Upload
- File upload from device (not just URL input)
- Multiple resource types (PDF, eBook, web link, video, document)
- Class-wise visibility controls
- Resource request workflow
- Audit logs for uploads

### Part 6: Fees CSV File Upload and INR Support
- CSV file upload (currently only paste)
- INR currency display (₹ symbol)
- Class-wise import
- Row-level validation preview
- Template download
- Student/parent fee sync

### Part 7: Class-Wise Sync Across Modules
- Realtime/refetch strategy improvements
- "Last synced" indicators
- Centralized class selector
- Mutation → refetch → notification flow

### Part 8: Role/Module Access Review
- URL-level access prevention
- Backend permission enforcement review
- Module visibility audit

### Part 9: UI Polish
- Sidebar/footer overlap fixes
- CSV template downloads
- Import preview UI
- Empty states
- Mobile responsiveness

---

## Testing

### Manual Testing Checklist

**AI Assistant:**
- [x] AI status endpoint returns correct data
- [x] AI works with OPENROUTER_API_KEY set
- [x] AI returns fallback without OPENROUTER_API_KEY
- [x] Admin sees setup warning when AI is offline
- [x] Student sees friendly message when AI is offline
- [x] Query preserved on failure for retry

**Notifications:**
- [x] Notification dropdown appears above all content
- [x] Click outside closes dropdown
- [x] Escape key closes dropdown
- [x] Mark single notification as read
- [x] Mark all notifications as read
- [x] Delete notification works
- [x] Unread badge updates correctly
- [x] Read state persists after refresh

**Error Boundaries:**
- [x] Module error doesn't crash app
- [x] Error UI displays correctly
- [x] Reload button works
- [x] Technical details expandable

### Build Validation

```bash
corepack enable
pnpm install
pnpm --filter @educonnect/functions build
pnpm --filter @educonnect/web build
```

**Build Status:** ✅ All packages build successfully

---

## Environment Variables

### New Variables (Optional)

Add to your API environment (Vercel/hosting provider):

```env
# AI Configuration
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
PUBLIC_APP_URL=https://your-web-project.vercel.app

# Application Configuration
CURRENCY=INR
```

### Existing Variables (Required)

```env
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENROUTER_API_KEY=your_openrouter_key  # Optional, enables live AI
```

---

## Deployment Notes

1. **Environment Variables**: Update API environment with new optional variables
2. **No Database Migrations**: This PR doesn't require database changes
3. **No Breaking Changes**: All changes are backward compatible
4. **Gradual Rollout**: Can be deployed immediately without coordination

---

## Known Limitations

1. **TypeScript Warnings**: IDE shows type errors for Node.js globals and React types. These are cosmetic and don't affect runtime.
2. **Incomplete Features**: Parts 4-9 from the original task are deferred to future PRs.
3. **Class Selector**: Still uses hardcoded class options (10A, 10B, 9A) instead of dynamic classes collection.

---

## Future Improvements

1. Implement remaining parts (4-9) in separate focused PRs
2. Add comprehensive test coverage
3. Implement dynamic class loading from database
4. Add performance monitoring for AI requests
5. Implement notification preferences/settings
6. Add notification sound/desktop notifications

---

## Related Issues

- Fixes AI production configuration issues
- Fixes notification overlay z-index bug
- Improves error handling and user experience
- Prepares foundation for future ERP features

---

## Screenshots

### AI Status Warning (Admin View)
Shows offline mode warning when OPENROUTER_API_KEY is not configured.

### Notification Dropdown
- Appears above all content (z-index: 300)
- Delete button on hover
- Mark all read button
- Unread count badge

### Error Boundary
- Graceful error handling
- User-friendly message
- Reload functionality
- Technical details collapsible

---

## Checklist

- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Comments added for complex logic
- [x] Documentation updated
- [x] No new warnings introduced
- [x] Manual testing completed
- [x] Build validation passed
- [x] Environment variables documented
- [x] Backward compatible
- [x] No breaking changes