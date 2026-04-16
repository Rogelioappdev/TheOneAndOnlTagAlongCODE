// Authentication
export { useAuth } from "./useAuth";

// Users
export {
  useCurrentUser,
  useUser,
  useSwipeableUsers,
  useUpdateProfile,
  useUploadProfilePhoto,
  userKeys,
} from "./useUsers";

// Trips
export {
  useTrips,
  useTrip,
  useMyTrips,
  useCreateTrip,
  useJoinTrip,
  useLeaveTrip,
  useSaveTrip,
  useUnsaveTrip,
  useSavedTrips,
  useIsTripSaved,
  useUploadTripImage,
  tripKeys,
} from "./useTrips";
export type { TripWithDetails } from "./useTrips";

// Matches
export {
  useMutualMatches,
  usePendingRequests,
  useSwipe,
  useSwipeManual,
  useRealtimeMatches,
  matchKeys,
} from "./useMatches";
export type { MatchWithDetails } from "./useMatches";

// Chat
export {
  useConversations,
  useMessages,
  useRealtimeMessages,
  useSendMessage,
  useCreateDirectConversation,
  useCreateTripConversation,
  useMarkAsRead,
  chatKeys,
} from "./useChat";
export type { ConversationWithDetails, MessageWithSender } from "./useChat";
