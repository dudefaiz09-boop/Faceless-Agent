# Phase 19: Library Role Access Notes

## Purpose

This note documents the library access behavior after the Phase 16 hardening work.

## Expected library manager access

Library write actions should be available to users who match at least one of these conditions:

- Admin user
- User with explicit `manageLibrary` permission
- User with the `librarian` role

Write actions include:

- Uploading library resources
- Editing library resources
- Archiving or deleting library resources
- Marking borrowed resources as returned

## Expected read access

Catalog visibility is still controlled by resource visibility settings:

- `all`
- `roles`
- `classes`

Admin, principal, and librarian users can see the full active catalog for management purposes.

## Regression checks

Use these checks when reviewing future library changes:

- Librarian can open Library management actions in the web app.
- Librarian can upload a resource through the backend route.
- Librarian can edit and archive a resource through the backend route.
- Student can view visible catalog resources.
- Student cannot upload, edit, or archive resources.
- Accountant cannot upload, edit, or archive library resources.
- Archived resources do not appear in the active catalog.

## Notes

Frontend gates are for user experience only. Backend route checks remain the source of truth for privileged library actions.
