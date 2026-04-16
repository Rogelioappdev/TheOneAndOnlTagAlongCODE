export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TravelStyle =
  | "luxury"
  | "backpacking"
  | "relaxed"
  | "cultural"
  | "budget"
  | "adventure"
  | "party"
  | "foodie";

export type TravelPace = "slow" | "balanced" | "fast";
export type GroupType = "close-knit" | "open";
export type PlanningStyle = "planner" | "spontaneous" | "flexible";
export type SocialEnergy = "introvert" | "extrovert" | "ambivert";
export type ExperienceLevel = "beginner" | "intermediate" | "experienced" | "expert";
export type Gender = "male" | "female" | "other";
export type MatchStatus = "pending" | "accepted" | "rejected";
export type TripStatus = "planning" | "confirmed" | "completed" | "cancelled";
export type TripMemberStatus = "in" | "maybe" | "out";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          age: number | null;
          bio: string | null;
          profile_photo: string | null;
          photos: string[];
          country: string | null;
          city: string | null;
          gender: Gender | null;
          travel_with: Gender | "everyone" | null;
          social_energy: SocialEnergy | null;
          travel_styles: TravelStyle[];
          travel_pace: TravelPace | null;
          group_type: GroupType | null;
          planning_style: PlanningStyle | null;
          experience_level: ExperienceLevel | null;
          places_visited: string[];
          bucket_list: string[];
          languages: string[];
          is_verified: boolean;
          availability: string | null;
          zodiac: string | null;
          mbti: string | null;
          travel_quote: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          age?: number | null;
          bio?: string | null;
          profile_photo?: string | null;
          photos?: string[];
          country?: string | null;
          city?: string | null;
          gender?: Gender | null;
          travel_with?: Gender | "everyone" | null;
          social_energy?: SocialEnergy | null;
          travel_styles?: TravelStyle[];
          travel_pace?: TravelPace | null;
          group_type?: GroupType | null;
          planning_style?: PlanningStyle | null;
          experience_level?: ExperienceLevel | null;
          places_visited?: string[];
          bucket_list?: string[];
          languages?: string[];
          is_verified?: boolean;
          availability?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          age?: number | null;
          bio?: string | null;
          profile_photo?: string | null;
          photos?: string[];
          country?: string | null;
          city?: string | null;
          gender?: Gender | null;
          travel_with?: Gender | "everyone" | null;
          social_energy?: SocialEnergy | null;
          travel_styles?: TravelStyle[];
          travel_pace?: TravelPace | null;
          group_type?: GroupType | null;
          planning_style?: PlanningStyle | null;
          experience_level?: ExperienceLevel | null;
          places_visited?: string[];
          bucket_list?: string[];
          languages?: string[];
          is_verified?: boolean;
          availability?: string | null;
          updated_at?: string;
        };
      };
      trips: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          description: string | null;
          destination: string;
          country: string;
          cover_image: string | null;
          images: string[];
          start_date: string | null;
          end_date: string | null;
          is_flexible_dates: boolean;
          vibes: string[];
          pace: TravelPace | null;
          group_preference: Gender | "everyone" | "mixed" | null;
          max_group_size: number;
          budget_level: string | null;
          status: TripStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          title: string;
          description?: string | null;
          destination: string;
          country: string;
          cover_image?: string | null;
          images?: string[];
          start_date?: string | null;
          end_date?: string | null;
          is_flexible_dates?: boolean;
          vibes?: string[];
          pace?: TravelPace | null;
          group_preference?: Gender | "everyone" | "mixed" | null;
          max_group_size?: number;
          budget_level?: string | null;
          status?: TripStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          creator_id?: string;
          title?: string;
          description?: string | null;
          destination?: string;
          country?: string;
          cover_image?: string | null;
          images?: string[];
          start_date?: string | null;
          end_date?: string | null;
          is_flexible_dates?: boolean;
          vibes?: string[];
          pace?: TravelPace | null;
          group_preference?: Gender | "everyone" | "mixed" | null;
          max_group_size?: number;
          budget_level?: string | null;
          status?: TripStatus;
          updated_at?: string;
        };
      };
      trip_members: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          status: TripMemberStatus;
          joined_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          status?: TripMemberStatus;
          joined_at?: string;
        };
        Update: {
          status?: TripMemberStatus;
        };
      };
      matches: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          trip_id: string | null;
          status: MatchStatus;
          user1_liked: boolean;
          user2_liked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          trip_id?: string | null;
          status?: MatchStatus;
          user1_liked?: boolean;
          user2_liked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: MatchStatus;
          user1_liked?: boolean;
          user2_liked?: boolean;
          updated_at?: string;
        };
      };
      swipes: {
        Row: {
          id: string;
          swiper_id: string;
          swiped_id: string;
          trip_id: string | null;
          direction: "left" | "right";
          created_at: string;
        };
        Insert: {
          id?: string;
          swiper_id: string;
          swiped_id: string;
          trip_id?: string | null;
          direction: "left" | "right";
          created_at?: string;
        };
        Update: never;
      };
      saved_trips: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_id: string;
          created_at?: string;
        };
        Update: never;
      };
      trip_chats: {
        Row: {
          id: string;
          trip_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          name?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      trip_messages: {
        Row: {
          id: string;
          trip_chat_id: string;
          sender_id: string;
          content: string;
          type: "text" | "image" | "system";
          reply_to_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_chat_id: string;
          sender_id: string;
          content: string;
          type?: "text" | "image" | "system";
          reply_to_id?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: never;
      };
      trip_chat_members: {
        Row: {
          id: string;
          trip_chat_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
          is_pinned: boolean;
          is_muted: boolean;
        };
        Insert: {
          id?: string;
          trip_chat_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string | null;
          is_pinned?: boolean;
          is_muted?: boolean;
        };
        Update: {
          last_read_at?: string | null;
          is_pinned?: boolean;
          is_muted?: boolean;
        };
      };
    };
    Views: {};
    Functions: {
      create_trip_with_chat: {
        Args: {
          p_creator_id: string;
          p_title: string;
          p_destination: string;
          p_country: string;
          p_cover_image?: string | null;
          p_description?: string | null;
          p_images?: string[];
          p_start_date?: string | null;
          p_end_date?: string | null;
          p_is_flexible?: boolean;
          p_vibes?: string[];
          p_pace?: string | null;
          p_group_preference?: string | null;
          p_max_group_size?: number;
          p_budget_level?: string | null;
          p_status?: string;
        };
        Returns: { trip_id: string; chat_id: string };
      };
      ensure_trip_chat_member: {
        Args: { p_trip_id: string };
        Returns: { success: boolean; error?: string; chat_id?: string };
      };
    };
    Enums: {};
  };
}

// Helper types for joins
export type UserProfile = Database["public"]["Tables"]["users"]["Row"];
export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type TripMember = Database["public"]["Tables"]["trip_members"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Swipe = Database["public"]["Tables"]["swipes"]["Row"];
export type SavedTrip = Database["public"]["Tables"]["saved_trips"]["Row"];
// Extended types with relations
export type TripWithMembers = Trip & {
  members: (TripMember & { user: UserProfile })[];
  creator: UserProfile;
};

export type MatchWithUsers = Match & {
  user1: UserProfile;
  user2: UserProfile;
  trip?: Trip | null;
};

// Trip chat types
export type TripChat = Database["public"]["Tables"]["trip_chats"]["Row"];
export type TripChatMember = Database["public"]["Tables"]["trip_chat_members"]["Row"];
export type TripMessage = Database["public"]["Tables"]["trip_messages"]["Row"];

export type MessageReaction = {
  id: string;
  user_id: string;
  emoji: string;
};

export type ReplyToMessage = {
  id: string;
  content: string;
  sender_id: string;
  sender: { name: string | null } | null;
} | null;

export type TripMessageWithSender = TripMessage & {
  sender: UserProfile;
  reactions?: MessageReaction[];
  reply_to?: ReplyToMessage;
};

export type TripChatWithDetails = TripChat & {
  trip?: Trip | null;
  members: (TripChatMember & { user: UserProfile })[];
  last_message?: TripMessage | null;
  unread_count: number;
};
