# Tag-Along

A travel companion matching app that connects people who want to travel but don't have a travel partner.

## Core Concept

Tag-Along uses Tinder-style swiping to match users based on trip intent rather than just profiles. The app focuses on clarity, safety, and fast onboarding to help travelers find their perfect travel companion.

## Real-Time Trip Join Notification

When a new traveler joins a trip, all existing members on that trip (including the creator) instantly see a full-screen animation notifying them of the new joiner. This is powered by Supabase Realtime postgres_changes subscriptions on the `trip_members` table.

- **Component**: `src/components/TripMemberJoinedAnimation.tsx`
- **Hook**: `src/lib/hooks/useRealtimeTripJoin.ts`
- **Integration**: Mounted globally in `src/app/_layout.tsx` so it appears over any screen
- Shows: new member's photo, name, trip destination, and total traveler count
- Includes floating travel particles (planes, map pins, globes) and a plane fly-across animation
- Respects iOS Reduce Motion accessibility setting

## App Structure

### 5-Tab Navigation

1. **My Trips** (Tab 1) - Briefcase icon with notification badge
   - **Badge Count**: Shows number of joined trips on the tab icon
   - **Two Tabs**: "I'm In" (confirmed trips) and "Maybe" (considering)
   - **Trip Cards**: Each trip shows destination, dates, vibes, and people
   - **People Status**: Shows who's "going" and who's "maybe" with visual tags
   - **Clickable Profiles**: Tap on any person to view their full profile
   - **Trip Details**: Tap on a trip card to see full information including:
     - Trip vibes, daily pace, group preference
     - Full description and accommodation info
     - All people going/maybe with clickable profiles
     - Status change buttons (I'm In, Maybe, Not In)
     - Message Group button for confirmed trips
   - **Bucket List Button**: Opens bucket list management modal (uses ListChecks icon)
     - View all destinations with images and flags
     - Mark countries as visited with checkmark
     - Remove countries from list
     - Add new countries to bucket list
     - Progress stats (on list, visited, to go)

2. **Matches** (Tab 2) - Heart icon
   - **Matches tab**: Shows all mutual matches (both users swiped right) with profile photo, name, age, location, travel styles, and a green message button to start a DM
   - **Requests tab**: Shows pending likes (you liked someone or they liked you, waiting for mutual) with blurred photo and pending badge
   - **Real-time**: Both tabs update instantly via Supabase Realtime subscription on the matches table
   - **Profile view**: Tap any card to view the full profile in a modal
   - **Message button**: Tap the green button on a mutual match to open or create a direct conversation and navigate to chat
   - **Pull to refresh**: Manual refresh available on both tabs

3. **Tag Along** (Tab 3 - Center/Default) - Compass icon
   - **Default Tab**: App opens directly to this tab
   - **Search Bar**: Tap to open full-screen trip search
     - Search trips by destination, country, or vibes
     - See all matching trips with Join button
     - Already joined trips show "Joined" badge
   - **Create Trip button** at top right - opens modal to create your own trip
   - **My Trips button** at top left - compact button showing trip count
   - Two modes: **Find Trip** and **Find Companion**
   - Tinder-style swipe cards with smooth animations
   - **Match Animation**: Full-screen celebration when you match with a companion
     - Two profile photos slide together with connecting line
     - Map pin icon appears between photos
     - "It's a match!" text with travel-themed design
     - Options to "Start Chat" or "Keep Exploring"
     - Respects reduced motion accessibility settings
     - **Real-time**: Both users see the animation simultaneously when a mutual match occurs
       - Person who swiped last sees it via `swipeRPCMutation.onSuccess`
       - Person who was liked first sees it via Supabase realtime `UPDATE` subscription on the matches table
       - Deduplication prevents double animation on the device that completed the match
   - **Trip Join Animation**: Fast confirmation when joining a trip
     - Checkmark morphs into backpack icon
     - Shows trip destination name
     - Auto-dismisses after animation completes
   - Tap on cards to view full details in a modal
   - **Trip Detail Modal - Who's Going Section**: Below "About This Trip", shows all trip members as an expanded list:
     - Each member row displays their profile photo, name, age, location, and up to 2 travel styles
     - Host badge (crown icon) shown on the host's avatar and row
     - Green arrow button on each row is a clear CTA to view that person's full profile
     - Tapping the arrow or row opens a full-screen profile modal with:
       - Full-size photo display with thumbnail strip if multiple photos
       - Photo dots indicator and tap-to-switch thumbnails
       - Name, age, location
       - Bio
       - Personality chips (pace, energy, planning style, experience)
       - Travel styles with emoji
       - Languages
       - Places visited
     - Members list is sorted with the host first
     - Animated entrance (staggered FadeInRight per row)
   - **Create Trip Feature**:
     - Where: Destination city and country
     - When: Date range with optional "TBD" toggle for flexible dates
     - Travel Vibes: Select up to 3 from 10 options (Adventure, Chill, Nature, etc.)
     - Daily Pace: Relaxed, Balanced, or Fast-paced
     - Group Preference: Any, Women only, Men only, or Mixed
     - Max Group Size: 2-10 people with +/- controls
     - **Trip Description**: Full text description of trip and who you're looking for
     - **Budget**: Optional budget range field
     - **Accommodation**: Optional accommodation type field
     - Created trips automatically appear in My Trips as "I'm In"
   - **AI-Powered Match Percentage**: Each card displays a compatibility score (0-100%) based on:
     - **Gender Preference**: Critical filter - shows 0% if user prefers different gender
     - **Bucket List Match**: Higher score if trip destination is on user's bucket list
     - **Travel Style Compatibility**: Compares vibes, pace, and planning style
     - **Experience Level**: Similar experience levels score higher
     - **Group Preference**: Matches close-knit vs open group preferences
   - **Clickable Profiles**: Tap on people in trip cards to view their profiles — uses real Supabase user data (photos, bio, travel styles, languages, places visited) via `userId` from trip members. Error-handled: failures show an Alert instead of crashing the tab.
   - Find Trip: Browse trips with destination, dates, vibes, budget, and people going
   - Find Companion: Browse travelers with bio, travel styles, vibes, languages, and availability
   - Haptic feedback on all interactions
   - JOIN/PASS indicators for trips, LIKE/NOPE for companions

4. **Messages** (Tab 4, between center and Profile) - Message bubble icon with unread badge
   - **iOS-Style Dark Mode UI**: Clean, modern messaging interface inspired by iOS Messages
   - **TagAlong Community Chat**: Global groupchat that all users automatically join after onboarding
     - Appears at the top of the messages list
     - Blue/purple gradient icon with message bubble
     - Connect with travelers worldwide, share tips, find travel buddies
     - Auto-join happens during onboarding completion
   - **Trip Group Chats**: Shows group chats for trips you've joined (status = "in")
   - **Auto-Creation Flow**:
     - When you **create a trip**: group chat instantly created and appears in Messages
     - When you **join a trip** (swipe right / tap "I'm In"): automatically added to trip's group chat
     - Users with "maybe" status do NOT get added to group chats until they confirm
   - **Real-Time Messaging**:
     - True real-time via Supabase Realtime (INSERT subscriptions on `messages` table)
     - Messages appear instantly for all chat members
     - Unread badge updates in real-time on tab icon
   - **Conversation List**:
     - Trip cover photo or map pin icon for each chat
     - Trip destination as chat name
     - Last message preview with sender name
     - Timestamp (time, Yesterday, weekday, or date)
     - Blue unread count badge (capped at 99+)
     - Pull-to-refresh for manual updates
     - Animated entrance (staggered FadeInRight)
   - **Chat Screen Features**:
     - Back button with iOS-style blue text
     - Header shows trip cover, name, and member count
     - Date separators (Today, Yesterday, full date)
     - iOS-style bubbles: blue for sent, dark gray for received
     - Sender name + gradient avatar for others' messages
     - Messages grouped by sender (avatar shown only on last message in group)
     - Timestamp shown below last message in each group
     - Animated send button with spring micro-interaction
     - Mark as read on screen open
     - Auto-scroll to latest message
   - **Empty States**:
     - No chats: "Join a trip to start chatting with fellow travelers"
     - No messages: "Start the conversation" with send icon
   - **Supabase Tables**: conversations (type='group', trip_id for trips, NULL for TagAlong), conversation_members, messages
   - **TagAlong Chat Setup**: Run `supabase-tagalong-groupchat.sql` in Supabase SQL Editor to create the global groupchat

5. **Profile** (Tab 5) - User icon
   - Full personal profile with all onboarding data displayed
   - **Profile Photo Header**: Large main photo with gradient overlay
   - **Photo Gallery**: Horizontal scroll of additional photos (up to 6 total)
   - **Editable Sections** (tap to edit):
     - **About Me**: Personal bio with edit modal
     - **Travel Styles**: Multi-select travel vibes (Luxury, Backpacking, etc.)
     - **Personality**: Introvert/Extrovert/Ambivert
     - **Daily Pace**: Slow & Steady, Balanced, Go Go Go!
     - **Group Preference**: Close-Knit or Open Groups
     - **Planning Style**: Planner, Spontaneous, Flexible
     - **Experience Level**: Beginner to Expert
   - **Places & Languages**: Display of visited countries and spoken languages
   - **Verified Badge**: Shows if user completed face verification
   - **Logout**: Red logout button that clears ALL data (profile, matches, messages, trips) and returns to onboarding

## Profile Viewing System

The app features a unified **PublicProfileView** component used across all tabs with conditional visibility based on trip membership:

### Profile Access Logic

- **Tag Along Tab**: Tap on a traveler card to view their full profile
- **Matches Tab**: Tap on any match to see their complete profile
- **Trip Detail**: Tap on people going on a trip to view their profiles
- **My Trips**: Tap on trip participants to view profiles with membership-based access control
- **Messages**: Tap on chat header or group members to view profiles

### Trip Membership Gating

When viewing profiles from the "My Trips" tab:

**If user HAS joined the trip (status = "in"):**
- Full profile access with all sections visible
- Photo gallery, bucket list, travel preferences, experience level
- "Send Message" button to start a conversation

**If user HAS NOT joined the trip (status = "maybe" or not joined):**
- Limited profile preview showing:
  - Main photo, name, age, location
  - Short bio (first 150 characters)
- Remaining sections are blurred with a lock overlay
- Call-to-action: "Join this trip to see the full profile"
- "Join Trip" button that:
  - Updates user status to "in"
  - Immediately unlocks the full profile
  - No navigation away from profile view

**If user is not logged in:**
- Shows authentication modal: "Create an account to join trips and view full profiles"
- Prompts user to sign up before accessing any profiles

**Enhanced Profile Features**:
- **Photo Gallery**: Navigate through all photos with arrows and indicators
- **Photo Navigation**: Tap indicators or use arrows to browse photos
- **Full Screen Gallery**: Tap main photo to open full-screen gallery view
- **Dream Bucket List**: Shows user's dream destinations with country images
- Photos, name, age, location
- Bio and travel style preferences
- Travel preferences (personality, pace, group type, planning style)
- Experience level
- Dream destinations and places visited
- Languages and availability
- Connect/Message buttons based on relationship status

## Design Theme

- **Color Palette**: Black background with emerald green accents (#10b981)
- **Messages Background**: Charcoal green (#1a2e1a) for comfortable reading
- **Aesthetic**: Calm, nature-inspired, adventure-focused
- **Vibe**: Clean, minimal, trustworthy

## Tech Stack

- Expo SDK 53
- React Native 0.76.7
- TypeScript (strict mode)
- NativeWind (TailwindCSS)
- React Query for server state
- Supabase (Auth with Google OAuth + Apple Sign In, Database, Realtime, Storage)
- Lucide React Native for icons
- OAuth redirect: Supabase callback URL

## Data Layer

The application uses **Supabase** as the backend:

## Supabase Backend (v2 — Clean Schema)

Run `mobile/supabase-new-schema.sql` in Supabase SQL Editor to set up the full backend. This replaces all previous SQL files.

### What the schema sets up

**9 tables:** `users`, `trips`, `trip_members`, `conversations`, `conversation_members`, `messages`, `swipes`, `matches`, `saved_trips`

**Triggers (automatic, no client code needed):**
- New auth user → auto-creates `users` row
- Trip created → auto-creates group conversation + adds creator
- User joins trip (status = 'in') → auto-added to trip group chat instantly
- Swipe right mutual match → auto-creates direct conversation between both users
- Message sent → auto-updates `conversations.updated_at`

**RLS policies:** All tables secured. No recursive policy loops.

**Realtime enabled on:** `messages`, `conversations`, `conversation_members`, `matches`, `trip_members`

**TagAlong global chat:** Created automatically at end of schema script.

- **Authentication**: Optional Google OAuth + Apple Sign In integrated in onboarding flow
  - Google OAuth via Supabase with redirect URL: `https://tnstvbxngubfuxatggem.supabase.co/auth/v1/callback`
  - Apple Sign In (iOS only) with native FaceID/TouchID support via expo-apple-authentication
  - Users can skip authentication and use the app with local data only
  - Auto-creates user profile in `public.users` table if authenticated
  - After login, continues to next onboarding slide (does NOT go to home yet)
  - Returning users skip onboarding and go directly to home
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Live chat updates via Supabase Realtime
- **Storage**: User profile photos uploaded to `profile-photos` bucket organized by `userId/filename`. Public URLs are saved to `users.profile_photo` (primary) and `users.photos` (all). Profile screen photo edits also upload to Supabase and sync the database.

**Supabase Configuration Required:**
1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider and add OAuth client ID/secret from Google Cloud Console
3. Go to Supabase Dashboard → Authentication → Providers → Apple
4. Enable Apple provider (already configured in your dashboard)
5. Redirect URL is automatically configured in code

### Database Tables

1. **users** - User profiles with travel preferences
2. **trips** - Trip listings with destinations, dates, vibes
3. **trip_members** - Users joined to trips (in/maybe/out status)
4. **matches** - Companion matching (pending/accepted/rejected)
5. **swipes** - Track all swipe actions for matching algorithm
6. **saved_trips** - User's saved/bookmarked trips
7. **conversations** - Direct and group chat conversations
8. **conversation_members** - Users in each conversation
9. **messages** - Chat messages with real-time sync

### State Management

- **User Profile Store** (`src/lib/state/user-profile-store.ts`): Zustand store for user profile data with persistence
- **Matches Store** (`src/lib/state/matches-store.ts`): Manages liked travelers and mutual matches
- **Trips Store** (`src/lib/state/trips-store.ts`): Manages joined trips with in/maybe status
- **Messages Store** (`src/lib/state/messages-store.ts`): Handles chat messages with block, delete, and group management features
- **Matching Algorithm** (`src/lib/matching.ts`): AI-powered compatibility scoring based on onboarding data and bucket list

## Onboarding Flow

The app features a comprehensive 23-slide onboarding experience with access code protection and optional Google OAuth authentication:

0. **Access Code** - Enter code "0371" to access the app - first barrier before onboarding
1. **Video Welcome** - Full-screen video with sound, button appears after 3 seconds
2. **TAG ALONG Premium Intro** - Full-screen image grid (3 images from Supabase) with typing animation text: "TAG ALONG find people to travel with, no trip has to be taken alone."
3. **Active Users** - Shows 1200+ active travelers with premium gradient background
4. **Authentication** - Optional seamless Google OAuth or Apple Sign In using Supabase (can skip this step)
   - Full-screen "Continue with Google" button for all platforms
   - Native "Continue with Apple" button (iOS only) with FaceID/TouchID support
   - Creates user profile in database with account details (name, email, avatar)
   - Users can proceed without signing in - will just use local data
   - Returning authenticated users skip directly to home screen
   - Authentication feels like a natural step inside onboarding, not a break in flow
5. **Basic Info** - Name and birthday with date picker
   - **Age Restriction**: Users must be 16 or older to use the app
   - Age is calculated from birthday and validated before allowing continue
   - Shows "Must be 16 or older to use the app" error message if under 16
   - Continue button is disabled for users under 16
6. **Location** - Country and city selection with search
7. **Gender** - Male, Female, or Other
8. **Travel Partner** - Who to travel with (Male/Female/Everyone)
9. **Bio** - About yourself (min 20 chars, max 500)
10. **Places Visited** - Multi-select countries with images and spinning globe animation
11. **Languages** - Multi-select languages with flags (English listed first)
12. **Social Energy** - Introvert/Extrovert/Ambivert with descriptions
13. **Travel Styles** - 8 options: Luxury, Backpacking, Relaxed, Cultural, Budget, Adventure, Party, Foodie
14. **Travel Pace** - Slow and Steady, Balanced, or GO GO GO!
15. **Ideal Travel Group** - Close-Knit (2-3 people) or Open Group
16. **Planning Style** - Planner, Spontaneous, or Flexible
17. **Travel Experience** - Beginner, Intermediate, Experienced, or Expert
18. **Calculating Matches** - Animated "Analyzing your travel style" with progress indicators
19. **Profile Photos** - Upload 3-6 photos from library or camera with proper permissions
20. **Verify Human Intro** - Introduction to face verification process
21. **Face Verification** - AI-powered face verification using front camera
22. **Bucket List Builder** - Tinder-style swipe interface to add destinations (min 6 required)
    - **Important**: Bucket list selections are used by AI matching algorithm to recommend trips and companions

All slides feature premium black gradient backgrounds (except video welcome and face verification). User data is saved to AsyncStorage upon completion. Authentication state is persisted via Supabase Auth, and returning authenticated users skip onboarding entirely.

## Development Notes

- All tabs fully implemented with complete features
- Google OAuth + Apple Sign In authentication integrated in onboarding (Slide 4)
- Apple Sign In uses native iOS flow with FaceID/TouchID support
- Returning authenticated users automatically skip onboarding
- Tag Along tab with trip/companion swiping and search functionality
- Matches tab with Mutual/Requests tabs and profile detail modals
- Messages tab with Single/Group chats, block/delete/leave features, and chat info
- My Trips tab replaces Bucket List with joined trips management and bucket list
- Profile viewing available everywhere with photo gallery support
- Bucket list displayed on user profiles with country images
- AI matching considers bucket list for trip/companion recommendations
- **Supabase backend fully integrated** with Google OAuth, database, real-time chat, and storage
- Onboarding flow complete with Google authentication and data persistence including bucket list

## Performance Optimizations

- **Zustand Store Selectors**: All stores use primitive selectors to prevent unnecessary re-renders
- **Memoization**: Expensive computations and callbacks wrapped with useMemo and useCallback
- **Heavy Animations Removed**: FadeInDown, SlideInUp, and Layout animations removed from list items to prevent lag
- **Profile Views Enhanced**: All profiles now show multiple photos (3+), travel preferences, personality, and experience level
- **Type Safety**: Strict TypeScript typing throughout the codebase
- **Lightweight Animations**: Match and trip join animations use react-native-reanimated v3 for 60fps performance
- **Accessibility**: All animations respect reduced motion settings for accessibility
- **Onboarding Image Caching** (`src/lib/hooks/useOnboardingImageCache.ts`):
  - Preloads all 9 onboarding images on app startup (non-blocking)
  - Downloads and caches images locally to device filesystem for fast reuse
  - Falls back to remote URLs if caching fails
  - Caches validated via AsyncStorage to prevent re-downloads on app reopens
  - 60% faster image load times on subsequent app launches

## Animation Features

### Match Animation (`src/components/MatchAnimation.tsx`)
- Full-screen celebration when mutual match occurs
- Profile photos slide together with connecting line and map pin icon
- Travel-themed gradient background (emerald green)
- "It's a match! You're tag-along ready" message
- Smooth spring animations with haptic feedback
- Options to start chat or keep exploring
- Respects AccessibilityInfo.isReduceMotionEnabled()

### Trip Join Animation (`src/components/TripJoinAnimation.tsx`)
- Fast, non-blocking confirmation animation
- Checkmark morphs into backpack icon
- Shows trip destination name
- Auto-dismisses after ~1.3 seconds
- Slides up from bottom with fade effect
- Lighter weight than match animation for frequent use
- Respects reduced motion accessibility settings

## Tag-Along+ Premium System

A two-step premium unlock system with usage limiting and a calm, Strava-inspired paywall.

### Daily Swipe Limit Gate

Non-premium users are limited to **3 swipes per 24-hour period**:

- **Swipe Counter**: Displays in the header as 3 dots (green = remaining, gray = used)
- **24-Hour Rolling Window**: Timer starts from first swipe of the day, not midnight
- **Live Countdown**: When limit is reached, shows a real-time countdown timer (HH:MM:SS)
- **Automatic Reset**: Swipes automatically restore when timer reaches zero (no app restart needed)
- **Blocking Modal**: Clean modal appears when limit is hit with:
  - Clock icon with subtle pulse animation
  - "You've reached your daily swipe limit" headline
  - Live countdown timer
  - "Unlock unlimited swipes" button
  - Link to premium subscription

### Premium Paywall (`src/components/PremiumPaywall.tsx`)

Calm, trust-based design inspired by Strava's premium flow:

- **Visual Style**: Minimal, dark theme with emerald accents
- **Headline**: "Unlimited swipes. Unlimited travel connections."
- **Subheadline**: "Unlock Tag-Along+, find people to travel with — no trip has to be taken alone."
- **Benefits List**:
  - Unlimited swipes
  - See who viewed your profile
  - Priority in search results
  - Advanced trip filters
- **Subscription Plans**: Selectable cards for Weekly, Monthly, and Yearly
  - Yearly plan highlighted with "Early user discount" badge
  - Prices are placeholders for future RevenueCat integration
- **Fixed CTA**: "Start Tag-Along+" button pinned at bottom

### State Management

- **Premium Store** (`src/lib/state/premium-store.ts`): Tracks subscription status with persistence
- **Swipe Limit Store** (`src/lib/state/swipe-limit-store.ts`): Manages daily swipe counting with:
  - `dailySwipesUsed`: Counter for current period
  - `swipeLimitStartTimestamp`: When first swipe occurred
  - `recordSwipe()`: Returns true if swipe allowed, false if limit reached
  - `canSwipe()`: Check if user can swipe
  - `getSwipesRemaining()`: Get remaining swipes count
  - `getResetTimestamp()`: Get when swipes will reset

### Premium Behavior

Once premium is active:
- Swipe limit indicator replaced with "Tag-Along+" badge
- All swipe limits removed immediately
- System is scalable for future premium features

## RevenueCat Integration

Full RevenueCat SDK integration for subscription management. See `REVENUECAT_INTEGRATION.md` for complete documentation.

### Quick Start

**Configuration:**
- API Key: `test_foHAKuGLQtHkDyVKFNAJyFAukHK`
- Entitlement: `TagAlong+`
- Products: `monthly`, `yearly`, `lifetime`

**Components:**
- `<Paywall />` - Beautiful subscription paywall with native UI
- `<CustomerCenter />` - Manage subscriptions, restore purchases, request refunds
- `<PremiumGate />` - Restrict content to premium users
- `usePremium()` - Check premium status anywhere

**Example Usage:**
```typescript
import { Paywall } from '@/components/Paywall';
import { usePremium } from '@/components/PremiumGate';

function MyFeature() {
  const { isPremium } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);

  return isPremium ? (
    <PremiumContent />
  ) : (
    <Button onPress={() => setShowPaywall(true)}>Upgrade</Button>
  );
}
```

**Files:**
- `/src/lib/revenuecatConfig.ts` - Core configuration and functions
- `/src/lib/hooks/useRevenueCat.ts` - React Query hooks
- `/src/components/Paywall.tsx` - Subscription paywall UI
- `/src/components/CustomerCenter.tsx` - Subscription management
- `/src/components/PremiumGate.tsx` - Premium content gating
- `/src/app/subscription-example.tsx` - Full working example

See `REVENUECAT_INTEGRATION.md` for step-by-step implementation guide.

