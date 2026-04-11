import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Users } from 'lucide-react-native';
import UserPreviewCard from './UserPreviewCard';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
const MAX_SHOWN = 5;

export interface TripPerson {
  userId: string;
  name: string;
  age: number;
  image?: string | null;
  photos?: string[];
  country?: string;
  city?: string;
  bio?: string;
  isHost?: boolean;
  gender?: 'male' | 'female' | 'other';
  travelStyles?: string[];
  placesVisited?: string[];
  bucketList?: string[];
  languages?: string[];
  availability?: string;
  travelPace?: string | null;
  socialEnergy?: string | null;
  planningStyle?: string | null;
  experience?: string | null;
}

interface Props {
  people: TripPerson[];
  accentColor?: string;
  borderColor?: string;
}

export default function WhoIsGoing({ people, accentColor = '#4a9d6e', borderColor = '#252b27' }: Props) {
  const [selectedPerson, setSelectedPerson] = useState<TripPerson | null>(null);

  if (!people || people.length === 0) return null;

  const shown = people.slice(0, MAX_SHOWN);
  const overflow = people.length - MAX_SHOWN;

  return (
    <>
      <View
        style={{ backgroundColor: 'rgba(26,31,28,0.6)' }}
        className="rounded-2xl p-3 mb-4"
      >
        <View className="flex-row items-center justify-between">
          {/* Avatars + label */}
          <View className="flex-row items-center">
            <View className="flex-row">
              {shown.map((person, i) => {
                const uri = person.image || (person.photos?.[0]) || PLACEHOLDER;
                return (
                  <Pressable
                    key={person.userId ?? String(i)}
                    onPress={() => setSelectedPerson(person)}
                    hitSlop={6}
                    style={{
                      marginLeft: i > 0 ? -12 : 0,
                      zIndex: MAX_SHOWN - i,
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        borderWidth: 2,
                        borderColor,
                      }}
                    />
                  </Pressable>
                );
              })}

              {overflow > 0 && (
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor,
                    marginLeft: -12,
                    backgroundColor: '#333a35',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 0,
                  }}
                >
                  <Text style={{ color: '#f5f5f0', fontSize: 11, fontWeight: '700' }}>
                    +{overflow}
                  </Text>
                </View>
              )}
            </View>

            <View className="ml-3">
              <Text style={{ color: '#f5f5f0' }} className="font-semibold">
                {people.length} going
              </Text>
              <Text style={{ color: accentColor }} className="text-xs">
                Tap to see profiles
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: 'rgba(45,90,69,0.3)' }} className="flex-row items-center px-2 py-1.5 rounded-full">
            <Users size={12} color={accentColor} strokeWidth={2} />
          </View>
        </View>
      </View>

      <UserPreviewCard
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
        accentColor={accentColor}
      />
    </>
  );
}
