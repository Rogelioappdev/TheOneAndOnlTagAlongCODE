import { UserProfile } from './state/user-profile-store';

// Types for matching
export interface MatchableTraveler {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other' | null;
  travelStyles: string[];
  vibes?: string[];
  destinations: string[];
  experience?: 'beginner' | 'intermediate' | 'experienced' | 'expert' | null;
  placesVisited?: string[];
  travelPace?: 'slow' | 'balanced' | 'fast' | null;
  planningStyle?: 'planner' | 'spontaneous' | 'flexible' | null;
  socialEnergy?: 'introvert' | 'extrovert' | 'ambivert' | null;
}

export interface MatchableTrip {
  id: string;
  destination: string;
  country: string;
  vibes: string[];
  people: Array<{
    name: string;
    gender?: 'male' | 'female' | 'other' | null;
  }>;
}

// Travel style mapping for normalization
const TRAVEL_STYLE_MAPPING: Record<string, string[]> = {
  // User styles to trip vibes
  'Backpacker': ['Adventure', 'Budget', 'Nature'],
  'Spontaneous': ['Adventure', 'Party', 'Road Trip'],
  'Budget': ['Backpacker', 'Budget'],
  'Planner': ['Culture', 'Spiritual'],
  'Mid-range': ['Culture', 'Food', 'Beach'],
  'Cultural': ['Culture', 'Spiritual', 'Food'],
  'Luxury': ['Food', 'Beach', 'Chill'],
  'Foodie': ['Food', 'Culture'],
  'Adventure': ['Adventure', 'Nature', 'Road Trip'],
  'Flexible': ['Chill', 'Adventure', 'Beach'],
  // Vibes mapping
  'Social': ['Party', 'Beach'],
  'Night owl': ['Party', 'Culture'],
  'Adventurous': ['Adventure', 'Nature', 'Road Trip'],
  'Chill': ['Chill', 'Beach', 'Nature'],
  'Early riser': ['Nature', 'Adventure'],
  'Photographer': ['Nature', 'Culture'],
  'Wellness': ['Spiritual', 'Chill', 'Nature'],
  'Creative': ['Culture', 'Party'],
  'Energetic': ['Adventure', 'Party', 'Road Trip'],
  'Sports': ['Adventure', 'Beach'],
  'Music lover': ['Party', 'Culture'],
};

// Experience level weights
const EXPERIENCE_LEVELS = {
  'beginner': 1,
  'intermediate': 2,
  'experienced': 3,
  'expert': 4,
};

/**
 * Calculate match percentage between user profile and a traveler
 * Factors:
 * - Gender preference (CRITICAL - 0% if incompatible)
 * - Bucket list / destinations overlap (25%)
 * - Travel styles overlap (25%)
 * - Experience level similarity (20%)
 * - Vibes/personality overlap (15%)
 * - Travel pace/planning style (15%)
 */
export function calculateTravelerMatch(
  userProfile: UserProfile | null,
  traveler: MatchableTraveler
): number {
  if (!userProfile) return 50; // Default if no profile

  let totalScore = 0;
  let maxScore = 0;

  // 1. GENDER PREFERENCE CHECK (Critical filter)
  // If user has a gender preference and traveler doesn't match, return 0
  if (userProfile.travelWith && userProfile.travelWith !== 'everyone') {
    if (traveler.gender && traveler.gender !== userProfile.travelWith) {
      return 0; // Hard filter - no match if gender preference not met
    }
    // If gender matches preference, add bonus
    if (traveler.gender === userProfile.travelWith) {
      totalScore += 20;
    }
    maxScore += 20;
  }

  // 2. BUCKET LIST / DESTINATIONS OVERLAP (25%)
  const bucketListScore = calculateArrayOverlap(
    userProfile.bucketList,
    traveler.destinations
  );
  totalScore += bucketListScore * 25;
  maxScore += 25;

  // 3. TRAVEL STYLES OVERLAP (25%)
  const userAllStyles = [
    ...userProfile.travelStyles,
    ...(userProfile.travelPace ? [userProfile.travelPace] : []),
    ...(userProfile.planningStyle ? [userProfile.planningStyle] : []),
  ];
  const travelerAllStyles = [
    ...traveler.travelStyles,
    ...(traveler.vibes || []),
  ];

  // Normalize styles for comparison
  const normalizedUserStyles = normalizeStyles(userAllStyles);
  const normalizedTravelerStyles = normalizeStyles(travelerAllStyles);

  const styleScore = calculateArrayOverlap(
    normalizedUserStyles,
    normalizedTravelerStyles
  );
  totalScore += styleScore * 25;
  maxScore += 25;

  // 4. EXPERIENCE LEVEL (20%)
  if (userProfile.experience && traveler.experience) {
    const userLevel = EXPERIENCE_LEVELS[userProfile.experience] || 2;
    const travelerLevel = EXPERIENCE_LEVELS[traveler.experience] || 2;
    const expDiff = Math.abs(userLevel - travelerLevel);
    const expScore = Math.max(0, 1 - expDiff * 0.3); // 30% penalty per level difference
    totalScore += expScore * 20;
  } else {
    totalScore += 10; // Partial score if missing
  }
  maxScore += 20;

  // 5. SOCIAL ENERGY / VIBES (15%)
  const vibesScore = calculateVibesMatch(userProfile, traveler);
  totalScore += vibesScore * 15;
  maxScore += 15;

  // 6. PLACES VISITED OVERLAP (15%) - Common ground bonus
  if (traveler.placesVisited && userProfile.placesVisited) {
    const placesScore = calculateArrayOverlap(
      userProfile.placesVisited,
      traveler.placesVisited
    );
    totalScore += placesScore * 15;
  } else {
    totalScore += 7.5; // Partial if missing
  }
  maxScore += 15;

  // Calculate final percentage
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50;

  // Clamp between 0 and 100
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Calculate match percentage between user profile and a trip
 * Factors:
 * - Gender preference of group members (CRITICAL)
 * - Bucket list includes destination (30%)
 * - Trip vibes match travel style (35%)
 * - Experience appropriate for trip (20%)
 * - Group vibe compatibility (15%)
 */
export function calculateTripMatch(
  userProfile: UserProfile | null,
  trip: MatchableTrip
): number {
  if (!userProfile) return 50; // Default if no profile

  let totalScore = 0;
  let maxScore = 0;

  // 1. GENDER PREFERENCE CHECK (Critical filter)
  if (userProfile.travelWith && userProfile.travelWith !== 'everyone') {
    const tripMembers = trip.people || [];
    // Check if any member doesn't match preference
    const incompatibleMembers = tripMembers.filter(
      p => p.gender && p.gender !== userProfile.travelWith
    );

    if (incompatibleMembers.length > 0) {
      // Reduce score based on incompatible members percentage
      const compatibilityRatio = 1 - (incompatibleMembers.length / Math.max(tripMembers.length, 1));
      if (compatibilityRatio < 0.5) {
        return Math.round(compatibilityRatio * 30); // Low score if too many incompatible
      }
      totalScore += compatibilityRatio * 20;
    } else {
      totalScore += 20; // Full score if all compatible
    }
    maxScore += 20;
  }

  // 2. BUCKET LIST INCLUDES DESTINATION (30%)
  const destinationInBucketList = userProfile.bucketList.some(
    place =>
      place.toLowerCase().includes(trip.destination.toLowerCase()) ||
      place.toLowerCase().includes(trip.country.toLowerCase()) ||
      trip.destination.toLowerCase().includes(place.toLowerCase()) ||
      trip.country.toLowerCase().includes(place.toLowerCase())
  );

  if (destinationInBucketList) {
    totalScore += 30;
  } else {
    // Check places visited for familiarity bonus
    const hasVisited = userProfile.placesVisited.some(
      place =>
        place.toLowerCase().includes(trip.destination.toLowerCase()) ||
        place.toLowerCase().includes(trip.country.toLowerCase())
    );
    if (hasVisited) {
      totalScore += 10; // Partial score for familiarity
    }
  }
  maxScore += 30;

  // 3. TRIP VIBES MATCH TRAVEL STYLE (35%)
  const userStyles = [
    ...userProfile.travelStyles,
    ...(userProfile.travelPace ? [userProfile.travelPace] : []),
    ...(userProfile.planningStyle ? [userProfile.planningStyle] : []),
  ];

  // Map user styles to comparable vibes
  const userVibes = new Set<string>();
  userStyles.forEach(style => {
    const mappedVibes = TRAVEL_STYLE_MAPPING[style];
    if (mappedVibes) {
      mappedVibes.forEach(v => userVibes.add(v.toLowerCase()));
    }
    userVibes.add(style.toLowerCase());
  });

  const tripVibesLower = trip.vibes.map(v => v.toLowerCase());
  const matchingVibes = tripVibesLower.filter(v => userVibes.has(v));
  const vibeScore = matchingVibes.length / Math.max(trip.vibes.length, 1);
  totalScore += vibeScore * 35;
  maxScore += 35;

  // 4. EXPERIENCE APPROPRIATE (20%)
  const experienceScore = calculateExperienceForTrip(userProfile, trip);
  totalScore += experienceScore * 20;
  maxScore += 20;

  // 5. GROUP SIZE PREFERENCE (15%)
  const groupScore = calculateGroupPreference(userProfile, trip);
  totalScore += groupScore * 15;
  maxScore += 15;

  // Calculate final percentage
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50;

  return Math.min(100, Math.max(0, percentage));
}

// Helper functions
function calculateArrayOverlap(arr1: string[], arr2: string[]): number {
  if (!arr1.length || !arr2.length) return 0.3; // Partial score if empty

  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  const set2 = new Set(arr2.map(s => s.toLowerCase()));

  let matches = 0;
  set1.forEach(item => {
    if (set2.has(item)) matches++;
    // Also check partial matches
    set2.forEach(item2 => {
      if (item.includes(item2) || item2.includes(item)) matches += 0.5;
    });
  });

  const maxPossible = Math.max(set1.size, set2.size);
  return Math.min(1, matches / maxPossible);
}

function normalizeStyles(styles: string[]): string[] {
  const normalized = new Set<string>();

  styles.forEach(style => {
    normalized.add(style.toLowerCase());
    const mapped = TRAVEL_STYLE_MAPPING[style];
    if (mapped) {
      mapped.forEach(v => normalized.add(v.toLowerCase()));
    }
  });

  return Array.from(normalized);
}

function calculateVibesMatch(
  userProfile: UserProfile,
  traveler: MatchableTraveler
): number {
  let score = 0.5; // Base score

  // Social energy matching
  if (userProfile.socialEnergy && traveler.socialEnergy) {
    if (userProfile.socialEnergy === traveler.socialEnergy) {
      score += 0.3;
    } else if (
      userProfile.socialEnergy === 'ambivert' ||
      traveler.socialEnergy === 'ambivert'
    ) {
      score += 0.15; // Ambivert compatible with both
    }
  }

  // Travel pace matching
  if (userProfile.travelPace && traveler.travelPace) {
    if (userProfile.travelPace === traveler.travelPace) {
      score += 0.2;
    } else if (
      userProfile.travelPace === 'balanced' ||
      traveler.travelPace === 'balanced'
    ) {
      score += 0.1;
    }
  }

  return Math.min(1, score);
}

function calculateExperienceForTrip(
  userProfile: UserProfile,
  trip: MatchableTrip
): number {
  // Determine trip difficulty based on vibes
  const adventureVibes = ['Adventure', 'Road Trip', 'Nature'];
  const relaxedVibes = ['Chill', 'Beach', 'Food'];

  const hasAdventureVibes = trip.vibes.some(v =>
    adventureVibes.map(a => a.toLowerCase()).includes(v.toLowerCase())
  );
  const hasRelaxedVibes = trip.vibes.some(v =>
    relaxedVibes.map(r => r.toLowerCase()).includes(v.toLowerCase())
  );

  const userExp = EXPERIENCE_LEVELS[userProfile.experience || 'intermediate'];

  if (hasAdventureVibes && !hasRelaxedVibes) {
    // Adventure trips favor experienced
    return userExp >= 2 ? 1 : 0.5;
  } else if (hasRelaxedVibes && !hasAdventureVibes) {
    // Relaxed trips good for all
    return 1;
  }

  // Mixed trips
  return 0.8;
}

function calculateGroupPreference(
  userProfile: UserProfile,
  trip: MatchableTrip
): number {
  const groupSize = trip.people.length;

  if (userProfile.groupType === 'close-knit') {
    // Prefers smaller groups
    return groupSize <= 4 ? 1 : Math.max(0.3, 1 - (groupSize - 4) * 0.1);
  } else if (userProfile.groupType === 'open') {
    // Open to larger groups
    return groupSize >= 3 ? 1 : 0.7;
  }

  return 0.8; // Default
}

/**
 * Get match color based on percentage
 */
export function getMatchColor(percentage: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (percentage >= 80) {
    return {
      bg: 'bg-emerald-500',
      text: 'text-white',
      border: 'border-emerald-400',
    };
  } else if (percentage >= 60) {
    return {
      bg: 'bg-emerald-500/80',
      text: 'text-white',
      border: 'border-emerald-400/80',
    };
  } else if (percentage >= 40) {
    return {
      bg: 'bg-amber-500',
      text: 'text-white',
      border: 'border-amber-400',
    };
  } else if (percentage >= 20) {
    return {
      bg: 'bg-orange-500',
      text: 'text-white',
      border: 'border-orange-400',
    };
  } else {
    return {
      bg: 'bg-red-500/80',
      text: 'text-white',
      border: 'border-red-400',
    };
  }
}

/**
 * Get match label based on percentage
 */
export function getMatchLabel(percentage: number): string {
  if (percentage >= 90) return 'Perfect Match';
  if (percentage >= 75) return 'Great Match';
  if (percentage >= 60) return 'Good Match';
  if (percentage >= 40) return 'Fair Match';
  if (percentage >= 20) return 'Low Match';
  return 'Poor Match';
}
