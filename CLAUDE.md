# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run on iOS simulator
expo run:ios

# Run on Android
expo run:android

# Start Metro bundler only
npx expo start
```

No lint or test commands are configured. TypeScript checking happens at build time via `tsc`.

## Stack

- **Expo SDK 55 / React Native 0.83** — file-based routing via `expo-router`
- **Supabase** — auth (Google OAuth + Apple Sign In), Postgres database, realtime, storage
- **React Query (@tanstack/react-query v5)** — all server/async state; use object API `useQuery({ queryKey, queryFn })`
- **Zustand** — persisted local state (trips, messages, user profile, premium, swipe limits)
- **NativeWind v4 + Tailwind v3** — styling (but most screens use inline `StyleSheet` or the theme tokens)
- **react-native-reanimated v4 + react-native-gesture-handler** — animations and gestures
- **Outfit font** — loaded in `app/_layout.tsx` as `Outfit-Regular`, `Outfit-SemiBold`, `Outfit-Bold`, `Outfit-ExtraBold`

## Project Structure

```
app/
  _layout.tsx          — Root layout: QueryClient, GestureHandlerRootView, auth guard, push notifications
  (tabs)/
    _layout.tsx        — Custom collapsible pill tab bar (3 tabs: Messages, TagAlong/Home, Profile)
    index.tsx          — Main swipe screen (trip cards)
    messages.tsx       — All conversations (DMs + group trip chats)
    profile.tsx        — User profile editor
    my-trips.tsx       — Joined/created trips (currently hidden via href:null)
  chat.tsx             — Individual chat thread
  onboarding.tsx       — Multi-step onboarding flow

lib/
  theme.ts             — Single source of truth: Colors, Font, FontSize, Spacing, Radius, TextStyles
  supabase.ts          — Supabase client + auth helpers + uploadProfilePhoto/uploadAvatarPhoto
  upload.ts            — uploadFile() + getImageMeta() — used for ALL image uploads to Vibecode storage
  database.types.ts    — All TypeScript types for DB rows (UserProfile, Trip, TripMember, etc.)
  matching.ts          — calculateTripMatch() scoring algorithm
  hooks/
    useTrips.ts        — useTrips, useJoinTrip, useSaveTrip, useSavedTrips, useCreateTrip, useDeleteTrip
    useTripChat.ts     — useTripMessages, useSendMessage, useSendImageMessage, useToggleReaction
    useChat.ts         — DM conversations, useCreateDirectConversation, useTotalUnreadCount
    useProfile.ts      — User profile read/update
    useAuth.ts         — Auth state
    useMatches.ts      — Match system
  state/               — Zustand stores (persisted via AsyncStorage)
    trips-store.ts     — joinedTrips list (local cache of joined trips)
    messages-store.ts  — unread counts, conversation metadata
    user-profile-store.ts — current user profile
    premium-store.ts   — RevenueCat subscription state
    swipe-limit-store.ts  — daily swipe cap tracking

components/
  CreateTripOnboarding.tsx  — Multi-step trip creation modal
  MyTripsModal.tsx          — Modal showing user's joined/created trips
  TripMembersSection.tsx    — Who's going section within trip card
  PublicProfileView.tsx     — Full profile view for other users
  userprofilemodal.tsx      — Modal wrapper for PublicProfileView
  tripDetailSheet.tsx       — Bottom sheet with full trip details
```

## Key Architectural Patterns

### Auth Flow
`app/_layout.tsx` checks `isAuthenticated()` on mount and on Supabase auth state changes. Unauthenticated users → `/onboarding`. After onboarding, checks `users.age` to distinguish new vs returning users (redirects returning users to `/welcome-back`).

### Image Uploads
**Always use `uploadFile(uri, filename, mimeType)` from `lib/upload.ts`** — it posts via `FormData` through the backend to Vibecode storage and works reliably on native iOS. Never use `fetch(uri)` on `file://` URIs (fails on native). The `uploadProfilePhoto` / `uploadAvatarPhoto` functions in `lib/supabase.ts` exist but are unused dead code.

### Trip Flow (current state)
1. Feed loads from `trips` table (status = 'planning') via `useTrips()`
2. Swipe right → `useJoinTrip()` mutates `trip_members` (status: 'in') + auto-adds to `trip_chat_members`
3. Swipe left → pass (no DB write)
4. `trips-store.ts` (Zustand) mirrors joined trips locally for instant UI

### Database Tables (core)
- `users` — profiles, `photos[]` array, travel preferences
- `trips` — destination, dates, budget, accommodation, group_size, creator_id, status
- `trip_members` — user_id, trip_id, status ('in'|'maybe'|'out')
- `saved_trips` — user_id, trip_id (bookmarks)
- `trip_chats` / `trip_chat_members` / `trip_messages` — group chat per trip
- `matches` / `direct_conversations` / `messages` — 1:1 match + DM system
- `message_reactions` — emoji reactions on trip messages

### Design System
- **Dark only** — OLED black (`#000000`) base
- **Accent** — Warm Stone `#F0EBE3`
- Import from `lib/theme.ts`: `Colors`, `Font`, `FontSize`, `Spacing`, `Radius`, `TextStyles`
- Never hardcode color or size values inline — always use theme tokens

### Tab Bar
The home screen (`index`) hides the tab bar (slides it off-screen). A swipe-up chevron handle reveals it. On all other tabs the bar is always visible. Implemented entirely in `app/(tabs)/_layout.tsx` using `Animated` (not Reanimated).

### Realtime
- Trip chat uses Supabase realtime channel `trip_chat:{chatId}` for live message inserts
- New trip member joins broadcast via `useRealtimeTripJoin` hook → triggers `TripMemberJoinedAnimation`

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=https://tnstvbxngubfuxatggem.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_BACKEND_URL=...   # Set by Rork build environment; required for uploadFile()
```

## Known Issues / Gotchas

- `my-trips` tab is registered in `_layout.tsx` but hidden (`href: null`) — content lives in `MyTripsModal`
- `useUploadTripImage` in `useTrips.ts` still uses the broken `fetch(uri)` pattern — needs the same fix applied to `useSendImageMessage`
- The `mobile/` subdirectory is a legacy Rork scaffold — source of truth is the root `app/`, `lib/`, `components/` directories
- Android `versionCode` must be bumped by 1 in `app.json` before every Google Play submission (currently at 1)
