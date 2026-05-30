import { createClient } from './supabase/client';

// ==========================================
// Bookmarks utility — Supabase-backed with localStorage fallback
// ==========================================
// Authenticated users: bookmarks are persisted to the Supabase `bookmarks` table.
// Unauthenticated users: bookmarks are stored in localStorage only.
// A "bookmarks-updated" custom event is dispatched on every toggle so
// cross-component listeners (explore page, detail page, bookmarks page) can sync.

const LS_KEY = 'hm_bookmarked_events';

// --------------- localStorage helpers ---------------

function readLocalBookmarks() {
  if (typeof window === 'undefined') return [];
  try {
    const list = localStorage.getItem(LS_KEY);
    return list ? JSON.parse(list) : [];
  } catch {
    return [];
  }
}

function writeLocalBookmarks(ids) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save bookmarks to localStorage:', e);
  }
}

function dispatchUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('bookmarks-updated'));
  }
}

// --------------- Auth helper ---------------

let _cachedUserId = null;

async function getAuthUserId() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    _cachedUserId = user?.id || null;
    return _cachedUserId;
  } catch {
    return null;
  }
}

// --------------- Public API ---------------

/**
 * Get all bookmarked event IDs for the current user.
 * Returns an array of event ID strings.
 */
export async function getBookmarkedEvents() {
  const userId = await getAuthUserId();

  if (userId) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookmarks')
        .select('event_id')
        .eq('user_id', userId);

      if (error) throw error;
      const ids = (data || []).map((row) => row.event_id);
      // Sync to localStorage for fast reads
      writeLocalBookmarks(ids);
      return ids;
    } catch (err) {
      console.error('getBookmarkedEvents supabase error:', err.message);
      // Fallback to localStorage
      return readLocalBookmarks();
    }
  }

  return readLocalBookmarks();
}

/**
 * Synchronous version — reads from localStorage cache only.
 * Use this in render paths where you can't await.
 */
export function getBookmarkedEventsSync() {
  return readLocalBookmarks();
}

/**
 * Check if a specific event is bookmarked (sync, from localStorage cache).
 */
export function isEventBookmarked(eventId) {
  if (!eventId) return false;
  const bookmarks = readLocalBookmarks();
  return bookmarks.includes(String(eventId).trim());
}

/**
 * Toggle a bookmark on/off. Returns true if bookmarked, false if removed.
 */
export async function toggleEventBookmark(eventId) {
  if (!eventId) return false;
  const idStr = String(eventId).trim();

  const userId = await getAuthUserId();

  if (userId) {
    try {
      const supabase = createClient();
      // Check if already bookmarked
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', idStr)
        .maybeSingle();

      if (existing) {
        // Remove bookmark
        await supabase.from('bookmarks').delete().eq('id', existing.id);
        // Update localStorage cache
        const localIds = readLocalBookmarks().filter((id) => id !== idStr);
        writeLocalBookmarks(localIds);
        dispatchUpdate();
        return false;
      } else {
        // Add bookmark
        const { error } = await supabase.from('bookmarks').insert({
          user_id: userId,
          event_id: idStr,
        });
        if (error) throw error;
        // Update localStorage cache
        const localIds = readLocalBookmarks();
        if (!localIds.includes(idStr)) localIds.push(idStr);
        writeLocalBookmarks(localIds);
        dispatchUpdate();
        return true;
      }
    } catch (err) {
      console.error('toggleEventBookmark supabase error:', err.message);
      // Fallback to localStorage-only toggle
    }
  }

  // Unauthenticated or Supabase error — localStorage only
  const bookmarks = readLocalBookmarks();
  const index = bookmarks.indexOf(idStr);
  let isAdded = false;

  if (index > -1) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(idStr);
    isAdded = true;
  }

  writeLocalBookmarks(bookmarks);
  dispatchUpdate();
  return isAdded;
}

/**
 * Migrate localStorage bookmarks to Supabase for a newly authenticated user.
 * Call this after login/signup to preserve any bookmarks saved while logged out.
 */
export async function migrateLocalBookmarksToSupabase() {
  const userId = await getAuthUserId();
  if (!userId) return;

  const localIds = readLocalBookmarks();
  if (localIds.length === 0) return;

  try {
    const supabase = createClient();
    // Fetch existing Supabase bookmarks to avoid duplicates
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('event_id')
      .eq('user_id', userId);

    const existingIds = new Set((existing || []).map((row) => row.event_id));
    const toInsert = localIds
      .filter((id) => !existingIds.has(id))
      .map((eventId) => ({ user_id: userId, event_id: eventId }));

    if (toInsert.length > 0) {
      await supabase.from('bookmarks').insert(toInsert);
    }
  } catch (err) {
    console.error('migrateLocalBookmarksToSupabase error:', err.message);
  }
}
