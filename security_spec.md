# Firestore Security Specification — reminderme

## 1. Data Invariants
1. Every document in `/users/{userId}` belongs strictly to the verified authenticated user (`request.auth.uid == userId` and `request.auth.token.email_verified == true`).
2. PII (`email`, `name`) stored in `/users/{userId}` is never readable by any user other than the owner (`isOwner(userId)`).
3. Every reminder in `/users/{userId}/reminders/{reminderId}` must carry `ownerId == request.auth.uid`, valid `id == reminderId`, valid `isValidId(reminderId)`, and verified parent user profile existence (`exists(/databases/$(database)/documents/users/$(userId))`).
4. All strings enforce strict `.size()` bounds (`title <= 120`, `note <= 400`, `tag <= 32`, `googleCalendarEventId <= 200`), arrays enforce strict size bounds (`days.size() <= 7`, `subtasks.size() <= 25`), and `createdAt`/`updatedAt` enforce `request.time`.
5. No shadow/unknown fields may be written on `create` or `update` (`hasOnly` + `affectedKeys().hasOnly`).
6. `ownerId`, `id`, and `createdAt` are immutable after creation.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Read**: Read `/users/alice/reminders/r1` without `request.auth`.
2. **Unverified Email Write**: Create `/users/alice` when `request.auth.token.email_verified == false`.
3. **Cross-User PII Read**: Authenticated user `bob` tries `get` on `/users/alice`.
4. **Cross-User Reminder List**: Authenticated user `bob` tries `list` on `/users/alice/reminders`.
5. **Identity Spoofing on Create**: User `alice` creates `/users/alice/reminders/r1` with `ownerId: "bob"`.
6. **Shadow Field Injection (Create)**: User `alice` creates `/users/alice` with extra ghost field `isAdmin: true`.
7. **Shadow Field Injection (Update)**: User `alice` updates `/users/alice/reminders/r1` adding ghost field `role: "superuser"`.
8. **ID Poisoning**: User `alice` creates `/users/alice/reminders/../../../bad$id` with invalid characters or length > 128.
9. **Resource Exhaustion (1MB String)**: User `alice` creates reminder with `note` of 5000 characters (> 400 limit).
10. **Unbounded Array Attack**: User `alice` creates reminder with `subtasks` array of 50 items (> 25 limit) or `days` array of 10 items (> 7 limit).
11. **Immutable Field Tampering**: User `alice` updates reminder changing `ownerId` or `createdAt`.
12. **Client Timestamp Spoofing**: User `alice` creates reminder with client-forged `createdAt` not equal to `request.time`.
