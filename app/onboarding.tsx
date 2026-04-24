import { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Dimensions, TextInput, ScrollView,
  Image, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
  Keyboard, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  MapPin, Camera as CameraIcon, Check, X, Lock,
  Shield, Plane,
} from 'lucide-react-native';
import OnboardingIntroSlide from '@/components/OnboardingIntroSlide';
import {
  signInWithGoogle, signInWithApple, ensureUserProfile,
  getCurrentUserId, savePhotoUrlsToDatabase, saveFullProfileToDatabase,
  savePushTokenToDatabase, supabase,
} from '@/lib/supabase';
import { uploadFile, getImageMeta } from '@/lib/upload';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming, withSpring,
  withSequence, withRepeat, withDelay, interpolate,
  FadeIn, FadeInDown, FadeInUp, Easing,
} from 'react-native-reanimated';
import { usePremiumSounds } from '@/lib/usePremiumSounds';
import { useJoinTagAlongChat } from '@/lib/hooks/useChat';
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');
const ACCENT = '#F0EBE3';
const SUPABASE_URL = 'https://tnstvbxngubfuxatggem.supabase.co';

// 6 curated trip images for the basic info collage — pulled from trip-images bucket
const COLLAGE_IMAGES = [
  `${SUPABASE_URL}/storage/v1/object/public/trip-images/beach/${encodeURIComponent('capri.jpeg')}`,
  `${SUPABASE_URL}/storage/v1/object/public/trip-images/europe/${encodeURIComponent('Spain travel Inspiration.jpeg')}`,
  `${SUPABASE_URL}/storage/v1/object/public/trip-images/mountain/${encodeURIComponent('Gang on top da mountain.jpeg')}`,
  `${SUPABASE_URL}/storage/v1/object/public/trip-images/asia/${encodeURIComponent('River Ban.jpeg')}`,
  `${SUPABASE_URL}/storage/v1/object/public/trip-images/beach/${encodeURIComponent('Surf.jpeg')}`,
  `${SUPABASE_URL}/storage/v1/object/public/trip-images/city/${encodeURIComponent('Amsterdamer Stil.jpeg')}`,
];

// ─── Country / city data ───────────────────────────────────────────────────────
const HOME_COUNTRIES = [
  { name: 'United States', flag: '🇺🇸', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco', 'Seattle', 'Denver', 'Miami', 'Atlanta', 'Boston', 'Austin', 'Las Vegas', 'Nashville', 'Portland', 'Orlando', 'San Diego', 'Dallas', 'Washington DC', 'New Orleans'] },
  { name: 'Canada', flag: '🇨🇦', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City', 'Hamilton', 'Victoria'] },
  { name: 'United Kingdom', flag: '🇬🇧', cities: ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Liverpool', 'Bristol', 'Glasgow', 'Leeds', 'Sheffield', 'Newcastle'] },
  { name: 'France', flag: '🇫🇷', cities: ['Paris', 'Marseille', 'Lyon', 'Nice', 'Bordeaux', 'Toulouse', 'Nantes', 'Strasbourg', 'Montpellier', 'Lille'] },
  { name: 'Germany', flag: '🇩🇪', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Bremen'] },
  { name: 'Spain', flag: '🇪🇸', cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Alicante'] },
  { name: 'Italy', flag: '🇮🇹', cities: ['Rome', 'Milan', 'Florence', 'Venice', 'Naples', 'Turin', 'Bologna', 'Genoa', 'Palermo', 'Verona'] },
  { name: 'Japan', flag: '🇯🇵', cities: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Hiroshima', 'Nara'] },
  { name: 'Australia', flag: '🇦🇺', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Hobart', 'Darwin'] },
  { name: 'Brazil', flag: '🇧🇷', cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Curitiba', 'Recife', 'Porto Alegre', 'Manaus'] },
  { name: 'Mexico', flag: '🇲🇽', cities: ['Mexico City', 'Guadalajara', 'Monterrey', 'Cancún', 'Puebla', 'Tijuana', 'Mérida', 'Oaxaca', 'Playa del Carmen', 'Acapulco'] },
  { name: 'India', flag: '🇮🇳', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Pune', 'Jaipur', 'Goa'] },
  { name: 'Netherlands', flag: '🇳🇱', cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Breda', 'Nijmegen', 'Maastricht'] },
  { name: 'Portugal', flag: '🇵🇹', cities: ['Lisbon', 'Porto', 'Faro', 'Braga', 'Coimbra', 'Funchal', 'Albufeira', 'Lagos', 'Sintra', 'Cascais'] },
  { name: 'Greece', flag: '🇬🇷', cities: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Rhodes', 'Santorini', 'Mykonos', 'Corfu', 'Nafplio', 'Chania'] },
  { name: 'Thailand', flag: '🇹🇭', cities: ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Krabi', 'Koh Samui', 'Hua Hin', 'Ayutthaya', 'Chiang Rai', 'Sukhothai'] },
  { name: 'Indonesia', flag: '🇮🇩', cities: ['Jakarta', 'Bali', 'Surabaya', 'Bandung', 'Yogyakarta', 'Lombok', 'Medan', 'Makassar', 'Malang', 'Denpasar'] },
  { name: 'South Korea', flag: '🇰🇷', cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Jeju City', 'Suwon', 'Changwon', 'Jeonju'] },
  { name: 'Turkey', flag: '🇹🇷', cities: ['Istanbul', 'Ankara', 'Izmir', 'Antalya', 'Bursa', 'Bodrum', 'Fethiye', 'Cappadocia', 'Marmaris', 'Pamukkale'] },
  { name: 'Argentina', flag: '🇦🇷', cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Bariloche', 'Ushuaia', 'Salta', 'Mar del Plata', 'El Calafate', 'Iguazú'] },
  { name: 'Colombia', flag: '🇨🇴', cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Santa Marta', 'Pereira', 'Bucaramanga', 'San Andrés', 'Leticia'] },
  { name: 'Morocco', flag: '🇲🇦', cities: ['Marrakech', 'Casablanca', 'Fes', 'Tangier', 'Rabat', 'Agadir', 'Chefchaouen', 'Essaouira', 'Meknes', 'Ouarzazate'] },
  { name: 'United Arab Emirates', flag: '🇦🇪', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Dubai Marina', 'Palm Jumeirah', 'Downtown Dubai'] },
  { name: 'South Africa', flag: '🇿🇦', cities: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth', 'Stellenbosch', 'Franschhoek', 'Knysna', 'George', 'Hermanus'] },
  { name: 'New Zealand', flag: '🇳🇿', cities: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin', 'Queenstown', 'Rotorua', 'Nelson', 'Napier-Hastings'] },
  { name: 'Vietnam', flag: '🇻🇳', cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hoi An', 'Nha Trang', 'Hue', 'Da Lat', 'Phu Quoc', 'Ha Long', 'Sapa'] },
  { name: 'Malaysia', flag: '🇲🇾', cities: ['Kuala Lumpur', 'Penang', 'Langkawi', 'Johor Bahru', 'Ipoh', 'Malacca', 'Kota Kinabalu', 'Kuching', 'Cameron Highlands', 'Putrajaya'] },
  { name: 'Philippines', flag: '🇵🇭', cities: ['Manila', 'Cebu City', 'Davao City', 'Boracay', 'Palawan', 'Siargao', 'Baguio', 'Iloilo City', 'Tagaytay', 'Batangas'] },
  { name: 'Singapore', flag: '🇸🇬', cities: ['Central', 'Orchard', 'Marina Bay', 'Sentosa', 'Jurong', 'Changi', 'Bugis', 'Clarke Quay', 'Little India', 'Chinatown'] },
  { name: 'Switzerland', flag: '🇨🇭', cities: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Lucerne', 'Zermatt', 'Interlaken', 'Lugano', 'St. Gallen'] },
];

// ─── Community guidelines ──────────────────────────────────────────────────────
const GUIDELINES = [
  { icon: '✈️', title: 'Real trips only', desc: 'No fake listings or misleading plans' },
  { icon: '🤝', title: 'Respect the crew', desc: 'Treat every traveler how you\'d want to be treated' },
  { icon: '📸', title: 'Be yourself', desc: 'Use real photos and honest bios' },
  { icon: '🔒', title: 'Keep it safe', desc: 'Never share personal financials in chats' },
  { icon: '🌍', title: 'Leave it better', desc: 'Respect local cultures and destinations' },
];

// ─── Types ─────────────────────────────────────────────────────────────────────
type OnboardingData = {
  name: string;
  birthday: Date | null;
  country: string;
  city: string;
  gender: 'male' | 'female' | 'other' | null;
  travelWith: 'male' | 'female' | 'everyone' | null;
  bio: string;
  placesVisited: string[];
  languages: string[];
  socialEnergy: 'introvert' | 'extrovert' | 'ambivert' | null;
  travelStyles: string[];
  travelPace: 'slow' | 'balanced' | 'fast' | null;
  groupType: 'close-knit' | 'open' | null;
  planningStyle: 'planner' | 'spontaneous' | 'flexible' | null;
  experience: 'beginner' | 'intermediate' | 'experienced' | 'expert' | null;
  verified: boolean;
  profilePhotos: string[];
};

// ─── Apple / Google SVG logos ──────────────────────────────────────────────────
const AppleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 814 1000" fill="none">
    <Path
      d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.2 0 663.1 0 541.8 0 347.4 96.5 250.4 240.2 250.4c75.8 0 138.5 42.8 185.4 42.8 44.5 0 114.9-45.9 199.5-45.9zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
      fill="#000"
    />
  </Svg>
);

const GoogleLogo = () => (
  <Svg width={20} height={20} viewBox="0 0 488 512">
    <Path
      d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
      fill="#4285F4"
    />
  </Svg>
);

// ─── Animated decorative elements ─────────────────────────────────────────────

/** Pulsing ring — same pattern as OnboardingIntroSlide CrewScene */
function PulsingRing({ size = 120, delay = 0 }: { size?: number; delay?: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1.18, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.18], [0.08, 0.22]),
  }));
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: ACCENT,
    }, style]} />
  );
}

/** Floating orb — subtle glass circle that drifts */
function FloatingOrb({ size = 48, dx = 0, dy = 0, delay = 0 }: { size?: number; dx?: number; dy?: number; delay?: number }) {
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx + interpolate(float.value, [0, 1], [0, 8]) },
      { translateY: dy + interpolate(float.value, [0, 1], [0, -12]) },
    ],
    opacity: interpolate(float.value, [0, 0.5, 1], [0.4, 0.7, 0.4]),
  }));
  return (
    <Animated.View style={[{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: 'rgba(240,235,227,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(240,235,227,0.12)',
    }, style]} />
  );
}

/** Progress dots — matching OnboardingIntroSlide dot style */
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{
          height: 5,
          width: i === current ? 34 : 20,
          borderRadius: 3,
          backgroundColor: i === current ? ACCENT : 'rgba(255,255,255,0.18)',
        }} />
      ))}
    </View>
  );
}

/** Glass icon circle — like the crew center in OnboardingIntroSlide */
function GlassIcon({ children, size = 80 }: { children: React.ReactNode; size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(240,235,227,0.09)',
      borderWidth: 1.5,
      borderColor: 'rgba(240,235,227,0.22)',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </View>
  );
}

/** Primary CTA button — accent color pill */
function CTAButton({
  label, onPress, disabled = false, loading = false,
}: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.96, { duration: 80 }); }}
        onPressOut={() => { scale.value = withSpring(1, { stiffness: 400, damping: 22 }); }}
        disabled={disabled || loading}
        style={{
          backgroundColor: disabled ? 'rgba(255,255,255,0.08)' : ACCENT,
          borderRadius: 999,
          paddingVertical: 18,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: disabled ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={disabled ? 'rgba(255,255,255,0.3)' : '#000'} />
        ) : (
          <Text style={{
            color: disabled ? 'rgba(255,255,255,0.25)' : '#000',
            fontSize: 16,
            fontWeight: '700',
            fontFamily: 'Outfit-Bold',
            letterSpacing: 0.2,
          }}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── Navigation state ───────────────────────────────────────────────────────
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [introStartAtCTA, setIntroStartAtCTA] = useState<boolean>(false);
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  // ── Access code ────────────────────────────────────────────────────────────
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeError, setAccessCodeError] = useState(false);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // ── Completion ─────────────────────────────────────────────────────────────
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);

  // ── Profile data ───────────────────────────────────────────────────────────
  const [localName, setLocalName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempBirthday, setTempBirthday] = useState<Date | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [profilePhotos, setProfilePhotos] = useState<string[]>([]);

  const [data, setData] = useState<OnboardingData>({
    name: '', birthday: null, country: '', city: '',
    gender: null, travelWith: null, bio: '',
    placesVisited: [], languages: [],
    socialEnergy: null, travelStyles: [],
    travelPace: null, groupType: null,
    planningStyle: null, experience: null,
    verified: false, profilePhotos: [],
  });

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { playHeavy, playSoft, playSuccess } = usePremiumSounds();
  const joinTagAlongChat = useJoinTagAlongChat();

  // ── Helpers ────────────────────────────────────────────────────────────────
  const calculateAge = (bd: Date) => {
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    return age;
  };

  const canContinue = () => {
    switch (currentSlide) {
      case 2: // Basic info (name + birthday combined)
        if (localName.trim().length < 2) return false;
        if (!data.birthday) return false;
        return calculateAge(data.birthday) >= 16;
      case 3: return data.country !== '' && data.city !== '';
      case 4: return guidelinesAccepted;
      case 5: return profilePhotos.length >= 1;
      default: return true;
    }
  };

  const filteredCountries = HOME_COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const selectedCountryData = HOME_COUNTRIES.find(c => c.name === data.country);
  const filteredCities = selectedCountryData
    ? selectedCountryData.cities.filter(city =>
        city.toLowerCase().includes(citySearch.toLowerCase())
      )
    : [];

  // ── Auth handlers (identical to original) ─────────────────────────────────
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    await playHeavy();
    const result = await signInWithGoogle();
    if (result.success) {
      const profileResult = await ensureUserProfile();
      if (profileResult.success) {
        setIsAuthenticated(true);
        await playSuccess();
        if (profileResult.isExistingUser) {
          await AsyncStorage.setItem('hasSeenOnboarding', 'true');
          router.replace({ pathname: '/welcome-back', params: { name: profileResult.userName || '' } });
        } else {
          setCurrentSlide(s => s + 1);
        }
      } else {
        setAuthError(profileResult.error || 'Failed to create profile');
      }
    } else {
      setAuthError(result.error || 'Failed to sign in');
    }
    setIsAuthenticating(false);
  };

  const handleAppleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    await playHeavy();
    const result = await signInWithApple();
    if (result.success) {
      const profileResult = await ensureUserProfile();
      if (profileResult.success) {
        setIsAuthenticated(true);
        await playSuccess();
        if (profileResult.isExistingUser) {
          await AsyncStorage.setItem('hasSeenOnboarding', 'true');
          router.replace({ pathname: '/welcome-back', params: { name: profileResult.userName || '' } });
        } else {
          setCurrentSlide(s => s + 1);
        }
      } else {
        setAuthError(profileResult.error || 'Failed to create profile');
      }
    } else {
      setAuthError(result.error || 'Failed to sign in');
    }
    setIsAuthenticating(false);
  };

  const handleEmailSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) {
      setAuthError(error.message);
      setIsAuthenticating(false);
      return;
    }
    const profileResult = await ensureUserProfile();
    if (profileResult.success) {
      setIsAuthenticated(true);
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      if (profileResult.isExistingUser) {
        router.replace({ pathname: '/welcome-back', params: { name: profileResult.userName || '' } });
      } else {
        setCurrentSlide(s => s + 1);
      }
    } else {
      setAuthError(profileResult.error || 'Failed to sign in');
    }
    setIsAuthenticating(false);
  };

  // ── Photo handlers ─────────────────────────────────────────────────────────
  const pickImageFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePhotos([result.assets[0].uri]);
      playHeavy();
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePhotos([result.assets[0].uri]);
      playHeavy();
    }
  };

  // ── handleContinue ─────────────────────────────────────────────────────────
  const handleContinue = async () => {
    await playSoft();
    if (currentSlide === 2) {
      setData(d => ({ ...d, name: localName.trim() }));
    }
    if (currentSlide === 5) {
      completeOnboarding();
    } else {
      setCurrentSlide(s => s + 1);
    }
  };

  // ── completeOnboarding (identical logic, adapted field set) ───────────────
  const completeOnboarding = async () => {
    try {
      setIsCompletingOnboarding(true);
      const userId = await getCurrentUserId();

      if (userId && profilePhotos.length > 0) {
        try {
          const uploadedUrls: string[] = [];
          for (let i = 0; i < profilePhotos.length; i++) {
            const uri = profilePhotos[i];
            const { mimeType, ext } = getImageMeta(uri);
            const filename = `avatar-${i}-${Date.now()}.${ext}`;
            const result = await uploadFile(uri, filename, mimeType);
            uploadedUrls.push(result.url);
          }
          data.profilePhotos = uploadedUrls;
          await savePhotoUrlsToDatabase(userId, uploadedUrls);
        } catch (uploadErr) {
          console.error('Failed to upload onboarding photos:', uploadErr);
          data.profilePhotos = profilePhotos;
        }
      } else if (!userId && profilePhotos.length > 0) {
        data.profilePhotos = profilePhotos;
      }

      if (userId) {
        const age = data.birthday
          ? Math.floor((Date.now() - new Date(data.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        await saveFullProfileToDatabase(userId, {
          name: data.name || undefined,
          age,
          bio: null,
          country: data.country || null,
          city: data.city || null,
          gender: null,
          travel_with: null,
          social_energy: null,
          travel_styles: [],
          travel_pace: null,
          group_type: null,
          planning_style: null,
          experience_level: null,
          places_visited: [],
          languages: [],
          is_verified: false,
        });

        try {
          await joinTagAlongChat.mutateAsync();
        } catch (chatError) {
          console.error('[Onboarding] Failed to join TagAlong chat:', chatError);
        }
      }

      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      await AsyncStorage.setItem('userProfile', JSON.stringify(data));

      if (userId) {
        try {
          const storedToken = await AsyncStorage.getItem('expoPushToken');
          if (storedToken) {
            await savePushTokenToDatabase(userId, storedToken);
          }
        } catch {
          // non-fatal
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1800));
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsCompletingOnboarding(false);
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // ── Loading overlay ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (isCompletingOnboarding) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        {/* Animated background orbs */}
        <PulsingRing size={200} delay={0} />
        <PulsingRing size={140} delay={400} />
        <FloatingOrb size={60} dx={-90} dy={-120} delay={200} />
        <FloatingOrb size={40} dx={100} dy={-80} delay={600} />
        <FloatingOrb size={32} dx={-60} dy={100} delay={400} />

        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingHorizontal: 40, zIndex: 10 }}>
          <Animated.View entering={FadeIn.delay(100).duration(500)}>
            <GlassIcon size={88}>
              <ActivityIndicator size="large" color={ACCENT} />
            </GlassIcon>
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.delay(200).springify()}
            style={{ color: '#fff', fontSize: 30, fontWeight: '800', fontFamily: 'Outfit-ExtraBold', marginTop: 32, letterSpacing: -0.5, textAlign: 'center' }}
          >
            Getting ready{'\n'}for takeoff
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(350).springify()}
            style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, fontFamily: 'Outfit-Regular', textAlign: 'center', lineHeight: 22, marginTop: 10 }}
          >
            Setting up your travel profile...
          </Animated.Text>
        </Animated.View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── Intro (before access code) ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (showIntro) {
    return (
      <OnboardingIntroSlide
        onAccessCode={() => setShowIntro(false)}
        startAtCTA={introStartAtCTA}
      />
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SLIDE 0: Access Code ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentSlide === 0) {
    const handleAccessCodeSubmit = () => {
      if (accessCode === '0371') {
        setAccessCodeError(false);
        setIntroStartAtCTA(false);
        playSuccess();
        setCurrentSlide(1);
      } else {
        setAccessCodeError(true);
        playHeavy();
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Decorative elements */}
          <View style={{ position: 'absolute', top: height * 0.15, alignSelf: 'center' }}>
            <PulsingRing size={180} delay={0} />
          </View>
          <FloatingOrb size={56} dx={-width * 0.35} dy={height * 0.12} delay={300} />
          <FloatingOrb size={36} dx={width * 0.3} dy={height * 0.08} delay={700} />
          <FloatingOrb size={44} dx={width * 0.25} dy={height * 0.65} delay={500} />
          <FloatingOrb size={28} dx={-width * 0.28} dy={height * 0.7} delay={900} />

          <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 }}>

            {/* Top wordmark */}
            <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ paddingTop: 8 }}>
              <Text style={os.wordmark}>TagAlong</Text>
            </Animated.View>

            {/* Center content */}
            <View style={{ alignItems: 'center' }}>
              <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginBottom: 28 }}>
                <GlassIcon>
                  <Lock size={36} color={ACCENT} strokeWidth={1.5} />
                </GlassIcon>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(300).springify()} style={{ alignItems: 'center', marginBottom: 36 }}>
                <Text style={os.title}>You're early.</Text>
                <Text style={os.subtitle}>
                  Enter your access code to join{'\n'}the adventure
                </Text>
              </Animated.View>

              {/* 4-digit input */}
              <Animated.View entering={FadeInUp.delay(450).springify()} style={{ width: '100%', marginBottom: 20 }}>
                <TextInput
                  value={accessCode}
                  onChangeText={(text) => { setAccessCode(text); setAccessCodeError(false); }}
                  onSubmitEditing={handleAccessCodeSubmit}
                  placeholder="_ _ _ _"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="number-pad"
                  maxLength={4}
                  returnKeyType="done"
                  textAlign="center"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 20,
                    paddingVertical: 22,
                    fontSize: 32,
                    fontWeight: '700',
                    fontFamily: 'Outfit-Bold',
                    color: '#fff',
                    letterSpacing: 16,
                    borderWidth: 1.5,
                    borderColor: accessCodeError
                      ? 'rgba(255,69,58,0.7)'
                      : accessCode.length === 4
                      ? 'rgba(240,235,227,0.4)'
                      : 'rgba(240,235,227,0.12)',
                  }}
                />
                {accessCodeError && (
                  <Animated.Text
                    entering={FadeIn.duration(200)}
                    style={{ color: '#FF453A', fontSize: 13, fontFamily: 'Outfit-SemiBold', textAlign: 'center', marginTop: 10 }}
                  >
                    That code doesn't match. Try again.
                  </Animated.Text>
                )}
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(550).springify()} style={{ width: '100%' }}>
                <CTAButton
                  label="Enter"
                  onPress={handleAccessCodeSubmit}
                  disabled={accessCode.length < 4}
                />
              </Animated.View>
            </View>

            {/* Bottom link */}
            <Animated.View entering={FadeIn.delay(800)} style={{ paddingBottom: 8, alignItems: 'center' }}>
              <Pressable
                onPress={() => { setIntroStartAtCTA(true); setShowIntro(true); }}
                hitSlop={12}
              >
                <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, fontFamily: 'Outfit-Regular', textDecorationLine: 'underline', textAlign: 'center' }}>
                  Don't have a code? Get notified when we launch
                </Text>
              </Pressable>
            </Animated.View>

          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SLIDE 1: Sign In ──────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentSlide === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Decorative */}
          <View style={{ position: 'absolute', top: height * 0.22, alignSelf: 'center' }}>
            <PulsingRing size={160} delay={200} />
          </View>
          <FloatingOrb size={50} dx={-width * 0.32} dy={height * 0.18} delay={100} />
          <FloatingOrb size={38} dx={width * 0.28} dy={height * 0.14} delay={500} />
          <FloatingOrb size={32} dx={width * 0.15} dy={height * 0.55} delay={800} />

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 }}>

              {/* Top row */}
              <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                <Text style={os.wordmark}>TagAlong</Text>
                <Pressable onPress={() => setCurrentSlide(s => s + 1)} hitSlop={12}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontFamily: 'Outfit-SemiBold', fontWeight: '600' }}>Skip</Text>
                </Pressable>
              </Animated.View>

              {/* Center — Icon + headline */}
              <View style={{ alignItems: 'center' }}>
                <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginBottom: 24 }}>
                  <GlassIcon size={72}>
                    <Plane size={32} color={ACCENT} strokeWidth={1.5} />
                  </GlassIcon>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(300).springify()} style={{ alignItems: 'center' }}>
                  <Text style={[os.title, { marginBottom: 10 }]}>
                    Your next{'\n'}adventure awaits.
                  </Text>
                  <Text style={os.subtitle}>
                    Join thousands of travelers already{'\n'}exploring the world together
                  </Text>
                </Animated.View>
              </View>

              {/* Auth buttons */}
              <Animated.View entering={FadeInUp.delay(400).springify()} style={{ paddingBottom: 12 }}>
                {authError && (
                  <View style={{ backgroundColor: 'rgba(255,69,58,0.12)', borderWidth: 1, borderColor: 'rgba(255,69,58,0.35)', borderRadius: 16, padding: 14, marginBottom: 16 }}>
                    <Text style={{ color: '#FF453A', textAlign: 'center', fontSize: 13, fontFamily: 'Outfit-SemiBold' }}>{authError}</Text>
                  </View>
                )}

                {/* Apple Sign In — iOS only */}
                {Platform.OS === 'ios' && (
                  <Pressable
                    onPress={handleAppleSignIn}
                    disabled={isAuthenticating}
                    style={{ marginBottom: 12 }}
                  >
                    <View style={{
                      backgroundColor: '#fff',
                      borderRadius: 999,
                      paddingVertical: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isAuthenticating ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <>
                          <View style={{ position: 'absolute', left: 20 }}>
                            <AppleLogo />
                          </View>
                          <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                            Continue with Apple
                          </Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                )}

                {/* Google Sign In */}
                <Pressable
                  onPress={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  style={{ marginBottom: 18 }}
                >
                  <View style={{
                    backgroundColor: '#fff',
                    borderRadius: 999,
                    paddingVertical: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {isAuthenticating ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <View style={{ position: 'absolute', left: 20 }}>
                          <GoogleLogo />
                        </View>
                        <Text style={{ color: '#000', fontSize: 16, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                          Continue with Google
                        </Text>
                      </>
                    )}
                  </View>
                </Pressable>

                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', fontFamily: 'Outfit-Regular', lineHeight: 16, marginBottom: 12 }}>
                  By continuing you agree to our Terms of Service{'\n'}and Privacy Policy
                </Text>

                {/* Email form (demo / dev) */}
                {showEmailForm ? (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    <TextInput
                      value={emailInput}
                      onChangeText={setEmailInput}
                      placeholder="Email"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={os.emailInput}
                    />
                    <TextInput
                      value={passwordInput}
                      onChangeText={setPasswordInput}
                      placeholder="Password"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      secureTextEntry
                      style={os.emailInput}
                    />
                    <Pressable
                      onPress={handleEmailSignIn}
                      disabled={isAuthenticating || !emailInput || !passwordInput}
                      style={{
                        backgroundColor: ACCENT,
                        borderRadius: 14,
                        paddingVertical: 14,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#000', fontSize: 15, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                        {isAuthenticating ? 'Signing in...' : 'Sign in'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setShowEmailForm(false)} style={{ alignItems: 'center' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Outfit-Regular' }}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => setShowEmailForm(true)} style={{ alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, fontFamily: 'Outfit-Regular', textDecorationLine: 'underline' }}>
                      Sign in with email
                    </Text>
                  </Pressable>
                )}
              </Animated.View>

            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SLIDE 2: Basic Info (name + birthday combined) ────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentSlide === 2) {
    const ageOk = data.birthday && calculateAge(data.birthday) >= 16;
    const ageTooYoung = data.birthday && calculateAge(data.birthday) < 16;

    // Collage circle positions — honeycomb pattern matching the reference
    const CIRCLE_SIZE = width * 0.27;
    const GAP = 8;
    const collageW = CIRCLE_SIZE * 3 + GAP * 2;
    const rowOffset = CIRCLE_SIZE * 0.5 + GAP * 0.5;

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* ── Top half: title + photo collage ──────────────────────── */}
              <View style={{ paddingHorizontal: 28, paddingTop: 12 }}>
                <Animated.View entering={FadeIn.delay(80).duration(500)} style={{ marginBottom: 4 }}>
                  <ProgressDots current={0} total={3} />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(150).springify()} style={{ marginTop: 12, marginBottom: 20 }}>
                  <Text style={os.slideTitle}>basic info</Text>
                  <Text style={os.slideSub}>let's get started with your profile</Text>
                </Animated.View>
              </View>

              {/* Photo collage — 6 circles in honeycomb layout */}
              <Animated.View entering={FadeIn.delay(250).duration(600)} style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: collageW, height: CIRCLE_SIZE * 2.6 }}>
                  {/* Row 1 — 3 circles */}
                  {[0, 1, 2].map(i => (
                    <Animated.View
                      key={`r1-${i}`}
                      entering={FadeInDown.delay(300 + i * 100).springify()}
                      style={{
                        position: 'absolute',
                        left: i * (CIRCLE_SIZE + GAP),
                        top: 0,
                        width: CIRCLE_SIZE,
                        height: CIRCLE_SIZE,
                        borderRadius: CIRCLE_SIZE / 2,
                        overflow: 'hidden',
                        borderWidth: 2,
                        borderColor: 'rgba(240,235,227,0.2)',
                      }}
                    >
                      <Image
                        source={{ uri: COLLAGE_IMAGES[i] }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </Animated.View>
                  ))}
                  {/* Row 2 — 2 circles offset */}
                  {[0, 1].map(i => (
                    <Animated.View
                      key={`r2-${i}`}
                      entering={FadeInDown.delay(600 + i * 100).springify()}
                      style={{
                        position: 'absolute',
                        left: rowOffset + i * (CIRCLE_SIZE + GAP),
                        top: CIRCLE_SIZE * 0.82,
                        width: CIRCLE_SIZE,
                        height: CIRCLE_SIZE,
                        borderRadius: CIRCLE_SIZE / 2,
                        overflow: 'hidden',
                        borderWidth: 2,
                        borderColor: 'rgba(240,235,227,0.2)',
                      }}
                    >
                      <Image
                        source={{ uri: COLLAGE_IMAGES[3 + i] }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </Animated.View>
                  ))}
                  {/* Row 3 — 1 circle centered */}
                  <Animated.View
                    entering={FadeInDown.delay(800).springify()}
                    style={{
                      position: 'absolute',
                      left: (collageW - CIRCLE_SIZE) / 2,
                      top: CIRCLE_SIZE * 1.64,
                      width: CIRCLE_SIZE,
                      height: CIRCLE_SIZE,
                      borderRadius: CIRCLE_SIZE / 2,
                      overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: 'rgba(240,235,227,0.2)',
                    }}
                  >
                    <Image
                      source={{ uri: COLLAGE_IMAGES[5] }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </Animated.View>
                </View>
              </Animated.View>

              {/* ── Bottom half: form card ────────────────────────────────── */}
              <Animated.View
                entering={FadeInUp.delay(400).springify()}
                style={{
                  backgroundColor: '#0A0A0A',
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderColor: 'rgba(240,235,227,0.1)',
                  paddingHorizontal: 24,
                  paddingTop: 28,
                  paddingBottom: 24,
                }}
              >
                {/* Name field */}
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Outfit-Bold', marginBottom: 10 }}>
                  Your name
                </Text>
                <TextInput
                  value={localName}
                  onChangeText={setLocalName}
                  placeholder="Traveler"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  autoCapitalize="words"
                  returnKeyType="done"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1.5,
                    borderColor: localName.length >= 2
                      ? 'rgba(240,235,227,0.45)'
                      : 'rgba(240,235,227,0.12)',
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    fontSize: 17,
                    fontWeight: '600',
                    fontFamily: 'Outfit-SemiBold',
                    color: '#fff',
                    marginBottom: 22,
                  }}
                />

                {/* Birthday field */}
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Outfit-Bold', marginBottom: 10 }}>
                  Your Birthday
                </Text>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setTempBirthday(data.birthday || new Date(2000, 0, 1));
                    setShowDatePicker(true);
                  }}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1.5,
                    borderColor: ageOk
                      ? 'rgba(240,235,227,0.45)'
                      : ageTooYoung
                      ? 'rgba(255,69,58,0.6)'
                      : 'rgba(240,235,227,0.12)',
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    flex: 1,
                    fontSize: 17,
                    fontWeight: '600',
                    fontFamily: 'Outfit-SemiBold',
                    color: data.birthday ? '#fff' : 'rgba(255,255,255,0.2)',
                  }}>
                    {data.birthday
                      ? data.birthday.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : 'dd / mm / yyyy'}
                  </Text>
                  {ageOk && <Check size={20} color={ACCENT} strokeWidth={2.5} />}
                </Pressable>

                {ageTooYoung ? (
                  <Animated.Text
                    entering={FadeIn.duration(200)}
                    style={{ color: '#FF453A', fontSize: 12, fontFamily: 'Outfit-SemiBold', marginTop: 8 }}
                  >
                    Must be 16 or older to use TagAlong
                  </Animated.Text>
                ) : (
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'Outfit-Regular', marginTop: 8 }}>
                    Your profile will show your age, not your birth date
                  </Text>
                )}

                {/* CTA */}
                <View style={{ marginTop: 28 }}>
                  <CTAButton
                    label="Continue"
                    onPress={handleContinue}
                    disabled={!canContinue()}
                  />
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* Date picker modal */}
        {showDatePicker && (
          <Pressable
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => setShowDatePicker(false)}
          >
            <Pressable
              onPress={e => e.stopPropagation()}
              style={{
                backgroundColor: '#0A0A0A',
                borderRadius: 28,
                padding: 24,
                width: width - 48,
                borderWidth: 1,
                borderColor: 'rgba(240,235,227,0.12)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: 'Outfit-Bold', textAlign: 'center', marginBottom: 16 }}>
                Select your birthday
              </Text>
              <DateTimePicker
                value={tempBirthday || new Date(2000, 0, 1)}
                mode="date"
                display="spinner"
                onChange={(_, selectedDate) => { if (selectedDate) setTempBirthday(selectedDate); }}
                maximumDate={new Date()}
                textColor="#ffffff"
                style={{ marginBottom: 8 }}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Pressable
                  onPress={() => { setShowDatePicker(false); setTempBirthday(null); }}
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: 'Outfit-SemiBold' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (tempBirthday) setData(d => ({ ...d, birthday: tempBirthday }));
                    setShowDatePicker(false);
                    setTempBirthday(null);
                  }}
                  style={{ flex: 1, backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#000', fontSize: 15, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>Done</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        )}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SLIDE 3: Location (country → city) ───────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentSlide === 3) {
    const pickingCity = data.country !== '';

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Decorative */}
          <FloatingOrb size={48} dx={-width * 0.34} dy={height * 0.06} delay={0} />
          <FloatingOrb size={32} dx={width * 0.3} dy={height * 0.04} delay={400} />

          <View style={{ flex: 1, paddingHorizontal: 28 }}>

            {/* Top */}
            <Animated.View entering={FadeIn.delay(80).duration(500)} style={{ paddingTop: 8, marginBottom: 20 }}>
              <ProgressDots current={1} total={3} />
              <View style={{ marginTop: 20 }}>
                <Text style={os.slideTitle}>
                  {pickingCity ? `Cities in\n${data.country}` : 'Where are\nyou based?'}
                </Text>
                {pickingCity && (
                  <Pressable
                    onPress={() => { setData(d => ({ ...d, country: '', city: '' })); setCitySearch(''); }}
                    style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <MapPin size={13} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontFamily: 'Outfit-Regular', textDecorationLine: 'underline' }}>
                      Change country
                    </Text>
                  </Pressable>
                )}
              </View>
            </Animated.View>

            {/* Search input */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={{ marginBottom: 12 }}>
              <TextInput
                value={pickingCity ? citySearch : countrySearch}
                onChangeText={pickingCity ? setCitySearch : setCountrySearch}
                placeholder={pickingCity ? 'Search cities...' : 'Search countries...'}
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(240,235,227,0.12)',
                  borderRadius: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  color: '#fff',
                  fontSize: 16,
                  fontFamily: 'Outfit-Regular',
                }}
              />
            </Animated.View>

            {/* Country / city list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              {(pickingCity ? filteredCities : filteredCountries.map(c => c.name)).map((item, idx) => {
                const flagItem = !pickingCity ? filteredCountries[idx] : null;
                const isSelected = pickingCity ? data.city === item : data.country === item;
                return (
                  <Animated.View key={item} entering={FadeIn.delay(idx * 20 > 300 ? 300 : idx * 20).duration(300)}>
                    <Pressable
                      onPress={() => {
                        playSoft();
                        if (pickingCity) {
                          setData(d => ({ ...d, city: item }));
                          setCitySearch('');
                          Keyboard.dismiss();
                        } else {
                          setData(d => ({ ...d, country: item, city: '' }));
                          setCountrySearch('');
                          Keyboard.dismiss();
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderRadius: 14,
                        marginBottom: 4,
                        backgroundColor: isSelected ? 'rgba(240,235,227,0.1)' : 'rgba(255,255,255,0.03)',
                        borderWidth: 1,
                        borderColor: isSelected ? 'rgba(240,235,227,0.3)' : 'transparent',
                      }}
                    >
                      {flagItem && (
                        <Text style={{ fontSize: 22, marginRight: 12 }}>{flagItem.flag}</Text>
                      )}
                      <Text style={{
                        flex: 1,
                        color: isSelected ? ACCENT : '#fff',
                        fontSize: 16,
                        fontFamily: isSelected ? 'Outfit-SemiBold' : 'Outfit-Regular',
                        fontWeight: isSelected ? '600' : '400',
                      }}>
                        {item}
                      </Text>
                      {isSelected && <Check size={18} color={ACCENT} strokeWidth={2.5} />}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>

          </View>

          {/* Floating CTA */}
          {canContinue() && (
            <Animated.View
              entering={FadeInUp.springify()}
              style={{
                position: 'absolute',
                bottom: insets.bottom + 16,
                left: 28,
                right: 28,
              }}
            >
              <CTAButton label="Continue" onPress={handleContinue} />
            </Animated.View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SLIDE 4: Community Guidelines ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentSlide === 4) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Decorative */}
          <View style={{ position: 'absolute', top: height * 0.04, alignSelf: 'center' }}>
            <PulsingRing size={100} delay={0} />
          </View>
          <FloatingOrb size={36} dx={-width * 0.35} dy={height * 0.25} delay={300} />
          <FloatingOrb size={28} dx={width * 0.32} dy={height * 0.3} delay={700} />

          <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 }}>

            {/* Top */}
            <Animated.View entering={FadeIn.delay(80).duration(500)} style={{ paddingTop: 8, alignItems: 'center' }}>
              <Animated.View entering={FadeInDown.delay(150).springify()} style={{ marginBottom: 16 }}>
                <GlassIcon size={56}>
                  <Shield size={26} color={ACCENT} strokeWidth={1.5} />
                </GlassIcon>
              </Animated.View>
              <Text style={[os.slideTitle, { textAlign: 'center', fontSize: 30 }]}>
                The TagAlong Code
              </Text>
              <Text style={[os.slideSub, { textAlign: 'center' }]}>
                A few things that keep our community{'\n'}a great place to travel with
              </Text>
            </Animated.View>

            {/* Guidelines list */}
            <View style={{ gap: 10 }}>
              {GUIDELINES.map((g, idx) => (
                <Animated.View key={g.title} entering={FadeInUp.delay(idx * 60 + 200).springify()}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(240,235,227,0.08)',
                    gap: 14,
                  }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: 'rgba(240,235,227,0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(240,235,227,0.15)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 18 }}>{g.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Outfit-Bold', marginBottom: 2 }}>
                        {g.title}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.42)', fontSize: 13, fontFamily: 'Outfit-Regular' }}>
                        {g.desc}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>

            {/* Agree + CTA */}
            <Animated.View entering={FadeInUp.delay(600).springify()} style={{ paddingBottom: 8 }}>
              <Pressable
                onPress={() => { setGuidelinesAccepted(a => !a); playSoft(); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}
              >
                <View style={{
                  width: 24, height: 24, borderRadius: 7,
                  backgroundColor: guidelinesAccepted ? ACCENT : 'rgba(255,255,255,0.06)',
                  borderWidth: 1.5,
                  borderColor: guidelinesAccepted ? ACCENT : 'rgba(240,235,227,0.18)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {guidelinesAccepted && <Check size={14} color="#000" strokeWidth={3} />}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: 'Outfit-Regular', flex: 1, lineHeight: 20 }}>
                  I agree to the TagAlong community guidelines
                </Text>
              </Pressable>

              <CTAButton
                label="I'm In"
                onPress={handleContinue}
                disabled={!canContinue()}
              />
            </Animated.View>

          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SLIDE 5: Profile Photo ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentSlide === 5) {
    const primaryPhoto = profilePhotos[0] ?? null;

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 28 }}>

            {/* Top */}
            <Animated.View entering={FadeIn.delay(80).duration(500)} style={{ paddingTop: 8 }}>
              <ProgressDots current={2} total={3} />
              <View style={{ marginTop: 20 }}>
                <Text style={os.slideTitle}>
                  Put a face to{'\n'}your adventure
                </Text>
                <Text style={os.slideSub}>
                  Profiles with photos get 3x more connections
                </Text>
              </View>
            </Animated.View>

            {/* Photo frame */}
            <Animated.View entering={FadeInUp.delay(250).springify()} style={{ alignItems: 'center' }}>
              <View style={{ width: width * 0.58, aspectRatio: 3 / 4, position: 'relative' }}>
                <Pressable
                  onPress={() => {
                    Alert.alert('Add Photo', 'Choose how to add your photo', [
                      { text: 'Camera', onPress: takePhoto },
                      { text: 'Photo Library', onPress: pickImageFromLibrary },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 24,
                    overflow: 'hidden',
                    borderWidth: primaryPhoto ? 2 : 1.5,
                    borderStyle: primaryPhoto ? 'solid' : 'dashed',
                    borderColor: primaryPhoto ? 'rgba(240,235,227,0.6)' : 'rgba(240,235,227,0.18)',
                    backgroundColor: 'rgba(240,235,227,0.04)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {primaryPhoto ? (
                    <>
                      <Image
                        source={{ uri: primaryPhoto }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        resizeMode="cover"
                      />
                      <View style={{ position: 'absolute', bottom: 14, left: 14 }}>
                        <View style={{
                          backgroundColor: 'rgba(240,235,227,0.15)',
                          borderWidth: 1,
                          borderColor: 'rgba(240,235,227,0.35)',
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}>
                          <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' }}>
                            Added
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <GlassIcon size={72}>
                        <CameraIcon size={32} color={ACCENT} strokeWidth={1.5} />
                      </GlassIcon>
                      <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, fontWeight: '600', fontFamily: 'Outfit-SemiBold', marginTop: 16, marginBottom: 4 }}>
                        Add your photo
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, fontFamily: 'Outfit-Regular' }}>
                        Tap to choose
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Remove button */}
                {primaryPhoto && (
                  <Pressable
                    onPress={() => setProfilePhotos([])}
                    hitSlop={10}
                    style={{
                      position: 'absolute', top: -12, right: -12,
                      backgroundColor: '#0A0A0A',
                      borderRadius: 999,
                      padding: 8,
                      borderWidth: 1.5,
                      borderColor: 'rgba(255,69,58,0.5)',
                      zIndex: 10,
                    }}
                  >
                    <X size={14} color="#FF453A" strokeWidth={2.5} />
                  </Pressable>
                )}
              </View>
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeInUp.delay(400).springify()} style={{ paddingBottom: 8 }}>
              {!primaryPhoto && (
                <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, fontFamily: 'Outfit-Regular', textAlign: 'center', marginBottom: 14 }}>
                  1 photo required to continue
                </Text>
              )}
              <CTAButton
                label="Start Exploring"
                onPress={handleContinue}
                disabled={!canContinue()}
              />
            </Animated.View>

          </View>
        </SafeAreaView>
      </View>
    );
  }

  return null;
}

// ─── Shared styles ───────────────────────────────────────────────────────────
const os = StyleSheet.create({
  wordmark: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
    fontFamily: 'Outfit-ExtraBold',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  slideTitle: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    fontFamily: 'Outfit-ExtraBold',
    letterSpacing: -0.8,
    lineHeight: 42,
    marginBottom: 10,
  },
  slideSub: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    lineHeight: 22,
  },
  emailInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(240,235,227,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
  },
});
