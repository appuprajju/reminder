import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { Reminder, SubtaskItem, UserPreferences } from '../types';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
] as const;

const app = initializeApp(firebaseConfig);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId || '';
const configuredDbId =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId?.trim() || '';
export const isFirestoreEnabled = Boolean(configuredDbId);
export const db = configuredDbId ? getFirestore(app, configuredDbId) : null;
export const auth = getAuth(app);

const basicGoogleProvider = new GoogleAuthProvider();
basicGoogleProvider.setCustomParameters({ prompt: 'select_account' });

const workspaceGoogleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => workspaceGoogleProvider.addScope(scope));
workspaceGoogleProvider.setCustomParameters({ prompt: 'select_account' });

// Strictly in-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

function notifyTokenChange(token: string | null) {
  cachedAccessToken = token;
  tokenListeners.forEach((fn) => fn(token));
}

export function subscribeWorkspaceToken(listener: (token: string | null) => void): () => void {
  tokenListeners.add(listener);
  listener(cachedAccessToken);
  return () => {
    tokenListeners.delete(listener);
  };
}

export function getWorkspaceAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearWorkspaceAccessToken() {
  notifyTokenChange(null);
}

// ============ Connection Validation & Structured Firestore Error Handling ============
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function isOfflineFirestoreError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /client is offline|unavailable|network/i.test(msg);
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined' && isFirestoreEnabled) {
  void testConnection();
}

// ============ Auth Lifecycle ============
export function initFirebaseAuth(
  onUserChange: (user: User | null, accessToken: string | null) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onUserChange(user, cachedAccessToken);
    } else if (!isSigningIn) {
      notifyTokenChange(null);
      onUserChange(null, null);
    }
  });
}

export async function signInWithGoogleBasic(): Promise<{
  user: User;
  accessToken: string | null;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, basicGoogleProvider);
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function signInWithGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string | null;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, workspaceGoogleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    notifyTokenChange(token);
    return { user: result.user, accessToken: token };
  } finally {
    isSigningIn = false;
  }
}

export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  isSigningIn = true;
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    notifyTokenChange(null);
    return result.user;
  } finally {
    isSigningIn = false;
  }
}

export async function signUpWithEmailPassword(
  name: string,
  email: string,
  password: string
): Promise<User> {
  isSigningIn = true;
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const trimmedName = name.trim().slice(0, 60);
    if (trimmedName) {
      await updateProfile(result.user, { displayName: trimmedName }).catch(() => {});
    }
    notifyTokenChange(null);
    return result.user;
  } finally {
    isSigningIn = false;
  }
}

export async function sendFirebasePasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutFirebase(): Promise<void> {
  notifyTokenChange(null);
  await signOut(auth);
}

// ============ Defensive Payload Sanitizers (Synchronized with firebase-blueprint.json) ============
function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || `r_${Date.now().toString(36)}`;
}

function sanitizeTime(raw: string): string {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : '09:00';
}

function sanitizeSubtasks(raw?: SubtaskItem[]): SubtaskItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item.title === 'string' && item.title.trim().length > 0)
    .slice(0, 25)
    .map((item, idx) => ({
      id: sanitizeId(item.id || `st_${idx + 1}`).slice(0, 64),
      title: item.title.trim().slice(0, 120),
      done: Boolean(item.done),
    }));
}

function sanitizeDays(days: number[] | null | undefined): number[] | null {
  if (!Array.isArray(days) || days.length === 0) return null;
  const unique = Array.from(
    new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))
  )
    .sort((a, b) => a - b)
    .slice(0, 7);
  return unique.length > 0 ? unique : null;
}

function buildReminderPayload(ownerId: string, reminder: Reminder, isCreate: boolean) {
  const id = sanitizeId(reminder.id);
  const payload: Record<string, unknown> = {
    id,
    ownerId,
    title: (reminder.title || 'Reminder').trim().slice(0, 120) || 'Reminder',
    note: (reminder.note || '').trim().slice(0, 400),
    time: sanitizeTime(reminder.time),
    dueAt: Number.isFinite(reminder.dueAt) ? reminder.dueAt : Date.now(),
    days: sanitizeDays(reminder.days),
    oneTimeDate: reminder.oneTimeDate ? reminder.oneTimeDate.slice(0, 10) : null,
    emoji: (reminder.emoji || (reminder.isAlarm ? '⏰' : '🔔')).slice(0, 16),
    color: (reminder.color || '#0A84FF').slice(0, 24),
    priority:
      reminder.priority === 'high' || reminder.priority === 'low' ? reminder.priority : 'med',
    tag: reminder.tag ? reminder.tag.trim().slice(0, 32) : null,
    isAlarm: Boolean(reminder.isAlarm),
    sound: reminder.sound ? String(reminder.sound).slice(0, 32) : null,
    doneDate: reminder.doneDate ? reminder.doneDate.slice(0, 10) : null,
    snoozedUntil:
      typeof reminder.snoozedUntil === 'number' && Number.isFinite(reminder.snoozedUntil)
        ? reminder.snoozedUntil
        : null,
    subtasks: sanitizeSubtasks(reminder.subtasks),
    googleCalendarEventId: reminder.googleCalendarEventId
      ? reminder.googleCalendarEventId.slice(0, 200)
      : null,
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    payload.createdAt = serverTimestamp();
  }
  return { id, payload };
}

function docDataToReminder(docId: string, data: Record<string, unknown>): Reminder {
  const createdTs = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    id: typeof data.id === 'string' ? data.id : docId,
    title: typeof data.title === 'string' ? data.title : 'Reminder',
    note: typeof data.note === 'string' ? data.note : '',
    time: typeof data.time === 'string' ? data.time : '09:00',
    dueAt: typeof data.dueAt === 'number' ? data.dueAt : Date.now(),
    days: Array.isArray(data.days) ? (data.days as number[]) : null,
    oneTimeDate: typeof data.oneTimeDate === 'string' ? data.oneTimeDate : null,
    emoji: typeof data.emoji === 'string' ? data.emoji : '⏰',
    color: typeof data.color === 'string' ? data.color : '#0A84FF',
    priority: data.priority === 'high' || data.priority === 'low' ? data.priority : 'med',
    tag: typeof data.tag === 'string' ? data.tag : null,
    isAlarm: Boolean(data.isAlarm),
    sound: typeof data.sound === 'string' ? data.sound : null,
    doneDate: typeof data.doneDate === 'string' ? data.doneDate : null,
    snoozedUntil: typeof data.snoozedUntil === 'number' ? data.snoozedUntil : null,
    subtasks: Array.isArray(data.subtasks) ? (data.subtasks as SubtaskItem[]) : [],
    googleCalendarEventId:
      typeof data.googleCalendarEventId === 'string' ? data.googleCalendarEventId : null,
    createdAt: createdTs,
  };
}

// ============ Firestore Operations ============
export async function ensureFirestoreUserProfile(
  user: User,
  prefs: Pick<UserPreferences, 'timeFormat' | 'autoDeleteCompleted' | 'vibrate'>
): Promise<boolean> {
  if (!db) return false;
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const name = (user.displayName || user.email?.split('@')[0] || 'User').slice(0, 80);
  const email = (user.email || '').slice(0, 160);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        name,
        email,
        tz: tz.slice(0, 64),
        timeFormat: prefs.timeFormat,
        autoDeleteCompleted: Boolean(prefs.autoDeleteCompleted),
        vibrate: Boolean(prefs.vibrate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name,
        email,
        tz: tz.slice(0, 64),
        timeFormat: prefs.timeFormat,
        autoDeleteCompleted: Boolean(prefs.autoDeleteCompleted),
        vibrate: Boolean(prefs.vibrate),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    if (isOfflineFirestoreError(error)) {
      return false;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeFirestoreReminders(
  userId: string,
  onData: (reminders: Reminder[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) return () => {};
  const path = `users/${userId}/reminders`;
  const q = query(collection(db, 'users', userId, 'reminders'), where('ownerId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => docDataToReminder(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt - a.createdAt);
      onData(items);
    },
    (error) => {
      if (isOfflineFirestoreError(error)) {
        return;
      }
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function syncAllRemindersToFirestore(
  userId: string,
  reminders: Reminder[],
  existingCloudIds: Set<string>
): Promise<void> {
  if (!db) return;
  const path = `users/${userId}/reminders`;
  try {
    const batch = writeBatch(db);
    const keepIds = new Set<string>();

    for (const r of reminders) {
      const safeId = sanitizeId(r.id);
      keepIds.add(safeId);
      const ref = doc(db, 'users', userId, 'reminders', safeId);
      const isCreate = !existingCloudIds.has(safeId);
      const { payload } = buildReminderPayload(userId, r, isCreate);
      if (isCreate) {
        batch.set(ref, payload);
      } else {
        batch.update(ref, payload);
      }
    }

    for (const oldId of existingCloudIds) {
      if (!keepIds.has(oldId)) {
        batch.delete(doc(db, 'users', userId, 'reminders', oldId));
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertSingleReminderInFirestore(
  userId: string,
  reminder: Reminder,
  existsInCloud: boolean
): Promise<void> {
  if (!db) return;
  const safeId = sanitizeId(reminder.id);
  const path = `users/${userId}/reminders/${safeId}`;
  const ref = doc(db, 'users', userId, 'reminders', safeId);
  try {
    if (existsInCloud) {
      const { payload } = buildReminderPayload(userId, reminder, false);
      await updateDoc(ref, payload);
    } else {
      const { payload } = buildReminderPayload(userId, reminder, true);
      await setDoc(ref, payload);
    }
  } catch (error) {
    if (isOfflineFirestoreError(error)) return;
    handleFirestoreError(error, existsInCloud ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteSingleReminderInFirestore(
  userId: string,
  reminderId: string
): Promise<void> {
  if (!db) return;
  const safeId = sanitizeId(reminderId);
  const path = `users/${userId}/reminders/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'reminders', safeId));
  } catch (error) {
    if (isOfflineFirestoreError(error)) return;
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
