import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, Dimensions, TextInput, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, TouchableOpacity, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Calendar, MapPin, User as UserIcon, Users, Edit3, Globe, Languages, Zap, Backpack, Clock, UsersRound, Map, Award, Camera as CameraIcon, Check, X, ImageIcon, Lock } from 'lucide-react-native';
import OnboardingIntroSlide from '@/components/OnboardingIntroSlide';
import { signInWithGoogle, signInWithApple, ensureUserProfile, isAuthenticated as checkAuth, getCurrentUserId, savePhotoUrlsToDatabase, saveFullProfileToDatabase, savePushTokenToDatabase, supabase } from '@/lib/supabase';
import { uploadFile, getImageMeta } from '@/lib/upload';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

// Ensure WebBrowser session completes properly
WebBrowser.maybeCompleteAuthSession();
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  withSpring,
  interpolate,
  runOnJS,
  withDelay,
  withSequence,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
  BounceIn,
  BounceInDown,
  FlipInYRight,
  RotateInDownLeft,
  LightSpeedInRight,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePremiumSounds } from '@/lib/usePremiumSounds';
import { useOnboardingImageCache } from '@/lib/hooks/useOnboardingImageCache';
import { useJoinTagAlongChat } from '@/lib/hooks/useChat';

const { width, height } = Dimensions.get('window');

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
  profilePhotos: string[];  // URLs of uploaded photos in Supabase
};

// Countries with flags and representative images
const VISIT_COUNTRIES = [
  { name: 'United States', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400' },
  { name: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400' },
  { name: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400' },
  { name: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400' },
  { name: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400' },
  { name: 'United Kingdom', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400' },
  { name: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400' },
  { name: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400' },
  { name: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400' },
  { name: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400' },
  { name: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=400' },
  { name: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400' },
  { name: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400' },
  { name: 'Netherlands', flag: '🇳🇱', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400' },
  { name: 'Switzerland', flag: '🇨🇭', image: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=400' },
  { name: 'Portugal', flag: '🇵🇹', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400' },
];

const HOME_COUNTRIES = [
  { name: 'United States', flag: '🇺🇸', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington DC', 'Boston', 'Nashville', 'Detroit', 'Portland', 'Las Vegas', 'Miami', 'Atlanta', 'Orlando', 'Minneapolis', 'New Orleans'] },
  { name: 'Canada', flag: '🇨🇦', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City', 'Hamilton', 'Victoria', 'Halifax', 'Saskatoon', 'Regina', 'St. Johns', 'Kelowna', 'Barrie', 'Windsor', 'Kitchener', 'London', 'Oshawa'] },
  { name: 'United Kingdom', flag: '🇬🇧', cities: ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Liverpool', 'Bristol', 'Glasgow', 'Leeds', 'Sheffield', 'Newcastle', 'Nottingham', 'Southampton', 'Cardiff', 'Belfast', 'Leicester', 'Brighton', 'Oxford', 'Cambridge', 'York', 'Bath'] },
  { name: 'France', flag: '🇫🇷', cities: ['Paris', 'Marseille', 'Lyon', 'Nice', 'Bordeaux', 'Toulouse', 'Nantes', 'Strasbourg', 'Montpellier', 'Lille', 'Rennes', 'Reims', 'Saint-Étienne', 'Toulon', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Cannes'] },
  { name: 'Germany', flag: '🇩🇪', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster'] },
  { name: 'Spain', flag: '🇪🇸', cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada', 'Elche', 'Oviedo', 'Santander', 'San Sebastián'] },
  { name: 'Italy', flag: '🇮🇹', cities: ['Rome', 'Milan', 'Florence', 'Venice', 'Naples', 'Turin', 'Bologna', 'Genoa', 'Palermo', 'Bari', 'Catania', 'Verona', 'Padua', 'Trieste', 'Brescia', 'Parma', 'Modena', 'Pisa', 'Siena', 'Amalfi'] },
  { name: 'Japan', flag: '🇯🇵', cities: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kawasaki', 'Sendai', 'Hiroshima', 'Kitakyushu', 'Chiba', 'Sakai', 'Niigata', 'Hamamatsu', 'Shizuoka', 'Okayama', 'Kumamoto', 'Nara'] },
  { name: 'Australia', flag: '🇦🇺', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Hobart', 'Darwin', 'Cairns', 'Townsville', 'Wollongong', 'Geelong', 'Ballarat', 'Bendigo', 'Toowoomba', 'Sunshine Coast', 'Launceston', 'Albury'] },
  { name: 'Brazil', flag: '🇧🇷', cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre', 'Goiânia', 'Belém', 'Guarulhos', 'Campinas', 'São Luís', 'Maceió', 'Natal', 'Campo Grande', 'Florianópolis', 'João Pessoa'] },
  { name: 'Mexico', flag: '🇲🇽', cities: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Cancún', 'Mérida', 'San Luis Potosí', 'Aguascalientes', 'Querétaro', 'Morelia', 'Chihuahua', 'Hermosillo', 'Saltillo', 'Culiacán', 'Acapulco', 'Oaxaca', 'Playa del Carmen'] },
  { name: 'India', flag: '🇮🇳', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Pune', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Goa'] },
  { name: 'China', flag: '🇨🇳', cities: ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou', 'Wuhan', 'Xian', 'Nanjing', 'Tianjin', 'Chongqing', 'Suzhou', 'Qingdao', 'Dalian', 'Shenyang', 'Xiamen', 'Kunming', 'Zhengzhou', 'Harbin', 'Hong Kong'] },
  { name: 'South Korea', flag: '🇰🇷', cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Changwon', 'Seongnam', 'Goyang', 'Yongin', 'Bucheon', 'Cheongju', 'Ansan', 'Jeonju', 'Jeju City', 'Anyang', 'Pohang', 'Gimhae'] },
  { name: 'Thailand', flag: '🇹🇭', cities: ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Krabi', 'Hua Hin', 'Koh Samui', 'Ayutthaya', 'Sukhothai', 'Nakhon Ratchasima', 'Udon Thani', 'Khon Kaen', 'Chiang Rai', 'Hat Yai', 'Surat Thani', 'Nonthaburi', 'Pak Kret', 'Ubon Ratchathani', 'Lopburi', 'Kanchanaburi'] },
  { name: 'Indonesia', flag: '🇮🇩', cities: ['Jakarta', 'Bali', 'Surabaya', 'Bandung', 'Medan', 'Yogyakarta', 'Semarang', 'Makassar', 'Palembang', 'Tangerang', 'Depok', 'Bogor', 'Malang', 'Lombok', 'Batam', 'Balikpapan', 'Manado', 'Padang', 'Denpasar', 'Solo'] },
  { name: 'Vietnam', flag: '🇻🇳', cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho', 'Nha Trang', 'Hue', 'Hoi An', 'Da Lat', 'Vung Tau', 'Quy Nhon', 'Buon Ma Thuot', 'Long Xuyen', 'Thai Nguyen', 'Phan Thiet', 'Rach Gia', 'Nam Dinh', 'Vinh', 'My Tho', 'Bien Hoa'] },
  { name: 'Philippines', flag: '🇵🇭', cities: ['Manila', 'Cebu City', 'Davao City', 'Quezon City', 'Makati', 'Pasig', 'Taguig', 'Boracay', 'Palawan', 'Baguio', 'Iloilo City', 'Bacolod', 'Cagayan de Oro', 'Zamboanga', 'General Santos', 'Dumaguete', 'Tagaytay', 'Siargao', 'Batangas', 'Angeles City'] },
  { name: 'Singapore', flag: '🇸🇬', cities: ['Singapore Central', 'Orchard', 'Marina Bay', 'Sentosa', 'Jurong', 'Changi', 'Tampines', 'Woodlands', 'Bugis', 'Little India', 'Chinatown', 'Clarke Quay', 'Holland Village', 'Tiong Bahru', 'Katong', 'Serangoon', 'Bedok', 'Ang Mo Kio', 'Bishan', 'Clementi'] },
  { name: 'Malaysia', flag: '🇲🇾', cities: ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Ipoh', 'Malacca', 'Kota Kinabalu', 'Kuching', 'Shah Alam', 'Petaling Jaya', 'Langkawi', 'Cameron Highlands', 'Penang', 'Putrajaya', 'Seremban', 'Alor Setar', 'Kuala Terengganu', 'Kota Bharu', 'Miri', 'Sandakan', 'Taiping'] },
  { name: 'Netherlands', flag: '🇳🇱', cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Breda', 'Nijmegen', 'Apeldoorn', 'Haarlem', 'Arnhem', 'Enschede', 'Maastricht', 'Dordrecht', 'Leiden', 'Delft', 'Amersfoort', 'Zwolle', 'Deventer'] },
  { name: 'Belgium', flag: '🇧🇪', cities: ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Liège', 'Charleroi', 'Namur', 'Leuven', 'Mons', 'Mechelen', 'Aalst', 'La Louvière', 'Kortrijk', 'Hasselt', 'Ostend', 'Sint-Niklaas', 'Tournai', 'Genk', 'Seraing', 'Roeselare'] },
  { name: 'Switzerland', flag: '🇨🇭', cities: ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel', 'Thun', 'Köniz', 'La Chaux-de-Fonds', 'Fribourg', 'Schaffhausen', 'Chur', 'Neuchâtel', 'Vernier', 'Zermatt', 'Interlaken'] },
  { name: 'Austria', flag: '🇦🇹', cities: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Linz', 'Klagenfurt', 'Villach', 'Wels', 'St. Pölten', 'Dornbirn', 'Wiener Neustadt', 'Steyr', 'Feldkirch', 'Bregenz', 'Leonding', 'Baden', 'Wolfsberg', 'Leoben', 'Krems', 'Hallstatt'] },
  { name: 'Portugal', flag: '🇵🇹', cities: ['Lisbon', 'Porto', 'Faro', 'Braga', 'Coimbra', 'Funchal', 'Setúbal', 'Aveiro', 'Évora', 'Viseu', 'Guimarães', 'Leiria', 'Albufeira', 'Lagos', 'Sintra', 'Cascais', 'Portimão', 'Tavira', 'Nazaré', 'Óbidos'] },
  { name: 'Greece', flag: '🇬🇷', cities: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Rhodes', 'Ioannina', 'Chania', 'Santorini', 'Mykonos', 'Corfu', 'Kavala', 'Kalamata', 'Alexandroupoli', 'Nafplio', 'Delphi', 'Olympia', 'Meteora', 'Zakynthos'] },
  { name: 'Turkey', flag: '🇹🇷', cities: ['Istanbul', 'Ankara', 'Izmir', 'Antalya', 'Bursa', 'Adana', 'Konya', 'Gaziantep', 'Mersin', 'Diyarbakır', 'Kayseri', 'Eskişehir', 'Samsun', 'Denizli', 'Bodrum', 'Fethiye', 'Cappadocia', 'Trabzon', 'Marmaris', 'Pamukkale'] },
  { name: 'Egypt', flag: '🇪🇬', cities: ['Cairo', 'Alexandria', 'Giza', 'Sharm El Sheikh', 'Hurghada', 'Luxor', 'Aswan', 'Port Said', 'Suez', 'Ismailia', 'Mansoura', 'Tanta', 'Asyut', 'Fayoum', 'Zagazig', 'Dahab', 'Marsa Alam', 'Siwa', 'El Gouna', 'Nuweiba'] },
  { name: 'South Africa', flag: '🇿🇦', cities: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Nelspruit', 'Kimberley', 'Polokwane', 'Pietermaritzburg', 'George', 'Stellenbosch', 'Franschhoek', 'Knysna', 'Hermanus', 'Kruger National Park', 'Soweto', 'Sandton', 'Camps Bay'] },
  { name: 'Morocco', flag: '🇲🇦', cities: ['Marrakech', 'Casablanca', 'Fes', 'Tangier', 'Rabat', 'Agadir', 'Chefchaouen', 'Essaouira', 'Meknes', 'Ouarzazate', 'Merzouga', 'Asilah', 'El Jadida', 'Tetouan', 'Ifrane', 'Dakhla', 'Taroudant', 'Moulay Idriss', 'Ait Benhaddou', 'Todra Gorge'] },
  { name: 'United Arab Emirates', flag: '🇦🇪', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain', 'Dubai Marina', 'Palm Jumeirah', 'Downtown Dubai', 'JBR', 'Deira', 'Bur Dubai', 'Business Bay', 'DIFC', 'Jumeirah', 'Al Barsha', 'Silicon Oasis', 'Sports City'] },
  { name: 'Argentina', flag: '🇦🇷', cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata', 'Salta', 'Santa Fe', 'Bariloche', 'Ushuaia', 'El Calafate', 'Iguazú', 'Neuquén', 'Posadas', 'San Juan', 'Resistencia', 'Santiago del Estero', 'Corrientes', 'Puerto Madryn'] },
  { name: 'Colombia', flag: '🇨🇴', cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Manizales', 'Villavicencio', 'Pasto', 'Montería', 'Armenia', 'Valledupar', 'Popayán', 'Sincelejo', 'San Andrés', 'Leticia'] },
  { name: 'Chile', flag: '🇨🇱', cities: ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Talca', 'Arica', 'Chillán', 'Iquique', 'Puerto Montt', 'Viña del Mar', 'Punta Arenas', 'Puerto Varas', 'San Pedro de Atacama', 'Easter Island', 'Valdivia', 'Coyhaique', 'Castro'] },
  { name: 'Peru', flag: '🇵🇪', cities: ['Lima', 'Cusco', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos', 'Huancayo', 'Tacna', 'Puno', 'Chimbote', 'Ica', 'Juliaca', 'Sullana', 'Chincha', 'Ayacucho', 'Machu Picchu', 'Nazca', 'Paracas', 'Mancora'] },
  { name: 'New Zealand', flag: '🇳🇿', cities: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Napier-Hastings', 'Dunedin', 'Palmerston North', 'Nelson', 'Rotorua', 'Queenstown', 'New Plymouth', 'Whangarei', 'Invercargill', 'Whanganui', 'Gisborne', 'Blenheim', 'Timaru', 'Taupo', 'Picton'] },
  { name: 'Ireland', flag: '🇮🇪', cities: ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Kilkenny', 'Wexford', 'Sligo', 'Dundalk', 'Bray', 'Navan', 'Ennis', 'Tralee', 'Carlow', 'Naas', 'Athlone', 'Letterkenny', 'Tullamore', 'Killarney'] },
  { name: 'Poland', flag: '🇵🇱', cities: ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Białystok', 'Katowice', 'Gdynia', 'Częstochowa', 'Radom', 'Sosnowiec', 'Toruń', 'Kielce', 'Rzeszów', 'Gliwice', 'Zakopane'] },
  { name: 'Czech Republic', flag: '🇨🇿', cities: ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'České Budějovice', 'Hradec Králové', 'Ústí nad Labem', 'Pardubice', 'Zlín', 'Havířov', 'Kladno', 'Most', 'Opava', 'Karlovy Vary', 'Český Krumlov', 'Kutná Hora', 'Telč', 'Mariánské Lázně'] },
  { name: 'Hungary', flag: '🇭🇺', cities: ['Budapest', 'Debrecen', 'Szeged', 'Miskolc', 'Pécs', 'Győr', 'Nyíregyháza', 'Kecskemét', 'Székesfehérvár', 'Szombathely', 'Szolnok', 'Tatabánya', 'Kaposvár', 'Érd', 'Veszprém', 'Békéscsaba', 'Zalaegerszeg', 'Sopron', 'Eger', 'Hévíz'] },
  { name: 'Sweden', flag: '🇸🇪', cities: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping', 'Lund', 'Umeå', 'Gävle', 'Borås', 'Södertälje', 'Eskilstuna', 'Karlstad', 'Täby', 'Växjö', 'Kiruna'] },
  { name: 'Norway', flag: '🇳🇴', cities: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Sandnes', 'Tromsø', 'Sarpsborg', 'Skien', 'Ålesund', 'Sandefjord', 'Haugesund', 'Tønsberg', 'Moss', 'Bodø', 'Arendal', 'Hamar', 'Lillehammer'] },
  { name: 'Denmark', flag: '🇩🇰', cities: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde', 'Herning', 'Silkeborg', 'Næstved', 'Fredericia', 'Viborg', 'Køge', 'Holstebro', 'Taastrup', 'Slagelse', 'Helsingør'] },
  { name: 'Finland', flag: '🇫🇮', cities: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 'Kuopio', 'Pori', 'Kouvola', 'Joensuu', 'Lappeenranta', 'Hämeenlinna', 'Vaasa', 'Rovaniemi', 'Seinäjoki', 'Mikkeli', 'Kotka', 'Savonlinna'] },
  { name: 'Russia', flag: '🇷🇺', cities: ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Chelyabinsk', 'Samara', 'Omsk', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Voronezh', 'Perm', 'Volgograd', 'Krasnodar', 'Sochi', 'Vladivostok', 'Irkutsk', 'Kaliningrad'] },
  { name: 'Israel', flag: '🇮🇱', cities: ['Tel Aviv', 'Jerusalem', 'Haifa', 'Rishon LeZion', 'Petah Tikva', 'Ashdod', 'Netanya', 'Beersheba', 'Holon', 'Bnei Brak', 'Ramat Gan', 'Ashkelon', 'Rehovot', 'Bat Yam', 'Herzliya', 'Kfar Saba', 'Modiin', 'Nazareth', 'Eilat', 'Tiberias'] },
];

const LANGUAGES = [
  { name: 'English', flag: '🇬🇧' },
  { name: 'Spanish', flag: '🇪🇸' },
  { name: 'French', flag: '🇫🇷' },
  { name: 'German', flag: '🇩🇪' },
  { name: 'Italian', flag: '🇮🇹' },
  { name: 'Portuguese', flag: '🇵🇹' },
  { name: 'Japanese', flag: '🇯🇵' },
  { name: 'Mandarin', flag: '🇨🇳' },
  { name: 'Korean', flag: '🇰🇷' },
  { name: 'Arabic', flag: '🇸🇦' },
  { name: 'Russian', flag: '🇷🇺' },
  { name: 'Hindi', flag: '🇮🇳' },
];

const TRAVEL_STYLES = [
  { id: 'luxury', label: 'Luxury', icon: '✨' },
  { id: 'backpacking', label: 'Backpacking', icon: '🎒' },
  { id: 'relaxed', label: 'Relaxed', icon: '🏖️' },
  { id: 'cultural', label: 'Cultural', icon: '🏛️' },
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'adventure', label: 'Adventure', icon: '🏔️' },
  { id: 'party', label: 'Party', icon: '🎉' },
  { id: 'foodie', label: 'Foodie', icon: '🍜' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [introStartAtCTA, setIntroStartAtCTA] = useState<boolean>(false);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [showButton, setShowButton] = useState(false);
  const [activeUsers] = useState(Math.floor(Math.random() * 500) + 1200);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  // Local state for name input to prevent lag
  const [localName, setLocalName] = useState('');

  // Access code state
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeError, setAccessCodeError] = useState(false);

  // Authentication states
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Loading overlay state
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);
  const [isRequestingPushPermission, setIsRequestingPushPermission] = useState(false);

  // Premium haptics
  const { playHeavy, playSoft, playSuccess } = usePremiumSounds();

  // Image caching
  const { getCachedImageUrl } = useOnboardingImageCache();

  // TagAlong groupchat join
  const joinTagAlongChat = useJoinTagAlongChat();

  // Calculating matches states
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationDone, setCalculationDone] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const calculationProgress = useSharedValue(0);

  // Profile photos state
  const [profilePhotos, setProfilePhotos] = useState<string[]>([]);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [socialProofPhotos, setSocialProofPhotos] = useState<string[]>([]);

  // Typing animation state for slide 2
  const [typingText, setTypingText] = useState('');
  const fullTypingText = 'Find people to travel with, no trip has to be taken alone.';
  const typingStarted = useRef(false);

  // Calculation progress animation style
  const calculationProgressStyle = useAnimatedStyle(() => ({
    width: `${calculationProgress.value}%`,
  }));

  // Start calculation when slide 19 appears (Calculating Matches)
  useEffect(() => {
    if (currentSlide === 19 && !isCalculating && !calculationDone) {
      setIsCalculating(true);
      calculationProgress.value = 0;
      calculationProgress.value = withTiming(100, { duration: 3000, easing: Easing.out(Easing.cubic) });

      const timer = setTimeout(() => {
        const matches = Math.floor(Math.random() * 300) + 450;
        setMatchCount(matches);
        setCalculationDone(true);
        setIsCalculating(false);
        playSuccess();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentSlide]);

  // Typing animation effect for slide 2
  useEffect(() => {
    if (currentSlide === 2 && !typingStarted.current) {
      typingStarted.current = true;
      setTypingText('');
      let index = 0;
      const interval = setInterval(() => {
        if (index < fullTypingText.length) {
          setTypingText(fullTypingText.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [currentSlide]);

  // Temporary birthday state for date picker
  const [tempBirthday, setTempBirthday] = useState<Date | null>(null);

  // Animation shared values
  const buttonScale = useSharedValue(1);
  const iconPulse = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const rotation = useSharedValue(0);

  const [data, setData] = useState<OnboardingData>({
    name: '',
    birthday: null,
    country: '',
    city: '',
    gender: null,
    travelWith: null,
    bio: '',
    placesVisited: [],
    languages: [],
    socialEnergy: null,
    travelStyles: [],
    travelPace: null,
    groupType: null,
    planningStyle: null,
    experience: null,
    verified: false,
    profilePhotos: [],
  });

  useEffect(() => {
    if (currentSlide === 1) {
      // Show button as active after 4 seconds
      const timer = setTimeout(() => {
        setShowButton(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
    // Fetch real user profile photos for social proof on sign-in slide
    if (currentSlide === 4 && socialProofPhotos.length === 0) {
      const fetchSocialPhotos = async () => {
        try {
          const { data } = await supabase
            .from('users')
            .select('profile_photo')
            .not('profile_photo', 'is', null)
            .neq('profile_photo', '')
            .limit(3);
          if (data && data.length > 0) {
            setSocialProofPhotos(data.map((u: any) => u.profile_photo).filter(Boolean));
          }
        } catch {
          // silently fail — fallback to colored circles
        }
      };
      fetchSocialPhotos();
    }
  }, [currentSlide]);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1
    );
  }, []);

  // Pulse animation for icons
  useEffect(() => {
    iconPulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const iconPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconPulse.value }],
  }));

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    await playHeavy();

    const result = await signInWithGoogle();

    if (result.success) {
      // Create user profile in database (or detect existing user)
      const profileResult = await ensureUserProfile();

      if (profileResult.success) {
        setIsAuthenticated(true);
        await playSuccess();

        if (profileResult.isExistingUser) {
          // Returning user — set onboarding flag and go to Welcome Back screen
          await AsyncStorage.setItem('hasSeenOnboarding', 'true');
          router.replace({ pathname: '/welcome-back', params: { name: profileResult.userName || '' } });
        } else {
          // New user — continue to next onboarding slide
          setCurrentSlide(currentSlide + 1);
        }
      } else {
        setAuthError(profileResult.error || "Failed to create profile");
      }
    } else {
      setAuthError(result.error || "Failed to sign in");
    }

    setIsAuthenticating(false);
  };

  const handleAppleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    await playHeavy();

    const result = await signInWithApple();

    if (result.success) {
      // Create user profile in database (or detect existing user)
      const profileResult = await ensureUserProfile();

      if (profileResult.success) {
        setIsAuthenticated(true);
        await playSuccess();

        if (profileResult.isExistingUser) {
          // Returning user — set onboarding flag and go to Welcome Back screen
          await AsyncStorage.setItem('hasSeenOnboarding', 'true');
          router.replace({ pathname: '/welcome-back', params: { name: profileResult.userName || '' } });
        } else {
          // New user — continue to next onboarding slide
          setCurrentSlide(currentSlide + 1);
        }
      } else {
        setAuthError(profileResult.error || "Failed to create profile");
      }
    } else {
      setAuthError(result.error || "Failed to sign in");
    }

    setIsAuthenticating(false);
  };

  // Email sign-in (used for demo account access)
  const handleEmailSignIn = async (email: string, password: string) => {
    setIsAuthenticating(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

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
        setCurrentSlide(currentSlide + 1);
      }
    } else {
      setAuthError(profileResult.error || 'Failed to sign in');
    }

    setIsAuthenticating(false);
  };

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const handleContinue = async () => {
    // Play sound and haptic
    await playSoft();
    await playHeavy();

    // Animate button press
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    // Sync local name to data when continuing from slide 5 (name input)
    if (currentSlide === 5) {
      setData({ ...data, name: localName });
    }
    if (currentSlide < 21) {
      setCurrentSlide(currentSlide + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      // Show loading overlay immediately
      setIsCompletingOnboarding(true);

      // Get current user ID (optional - user can continue without signing in)
      const userId = await getCurrentUserId();

      // Upload profile photos using Vibecode storage if user is authenticated
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
          data.profilePhotos = profilePhotos; // fallback to local URIs
        }
      } else if (!userId && profilePhotos.length > 0) {
        // If not authenticated, just store photo URIs locally
        data.profilePhotos = profilePhotos;
      }

      // Save all onboarding profile data to Supabase so other users can see it
      if (userId) {
        const age = data.birthday
          ? Math.floor((Date.now() - new Date(data.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        await saveFullProfileToDatabase(userId, {
          name: data.name || undefined,
          age: age,
          bio: data.bio || null,
          country: data.country || null,
          city: data.city || null,
          gender: data.gender,
          travel_with: data.travelWith,
          social_energy: data.socialEnergy,
          travel_styles: data.travelStyles as any[],
          travel_pace: data.travelPace,
          group_type: data.groupType,
          planning_style: data.planningStyle,
          experience_level: data.experience,
          places_visited: data.placesVisited,
          languages: data.languages,
          is_verified: data.verified,
        });

        // Join the TagAlong global groupchat
        try {
          await joinTagAlongChat.mutateAsync();
          console.log('[Onboarding] Successfully joined TagAlong groupchat');
        } catch (chatError) {
          console.error('[Onboarding] Failed to join TagAlong chat:', chatError);
          // Don't block onboarding if chat join fails
        }
      }

      // Save onboarding completion and user data
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      await AsyncStorage.setItem('userProfile', JSON.stringify(data));

      // Save push token to database if available
      if (userId) {
        try {
          const storedToken = await AsyncStorage.getItem('expoPushToken');
          if (storedToken) {
            await savePushTokenToDatabase(userId, storedToken);
          }
        } catch {
          // Non-fatal
        }
      }

      // Ensure loading animation shows for at least 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to tag-along swiping (home tab)
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsCompletingOnboarding(false);
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    }
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const canContinue = () => {
    switch (currentSlide) {
      case 4:  // Google Authentication
        return true;
      case 5:  // Name & Birthday (Basic Info)
        if (localName.trim() === '' || data.birthday === null) {
          return false;
        }
        // Must be 16 or older
        const age = calculateAge(data.birthday);
        return age >= 16;
      case 6:  // Location (Country & City)
        return data.country !== '' && data.city !== '';
      case 8:  // Gender
        return data.gender !== null;
      case 9:  // Travel Partner
        return data.travelWith !== null;
      case 10:  // Bio
        return data.bio.trim().length >= 20;
      case 11:  // Places Visited
        return data.placesVisited.length > 0;
      case 12:  // Languages
        return data.languages.length > 0;
      case 13:  // Social Energy
        return data.socialEnergy !== null;
      case 14:  // Travel Styles
        return data.travelStyles.length > 0;
      case 15:  // Travel Pace
        return data.travelPace !== null;
      case 16:  // Group Type
        return data.groupType !== null;
      case 17:  // Planning Style
        return data.planningStyle !== null;
      case 18:  // Experience
        return data.experience !== null;
      case 21:  // Profile Photos
        return profilePhotos.length >= 1;
      case 23:  // Face Verification
        return data.verified;
      default:
        return true;
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

  const toggleCountryVisit = async (country: string) => {
    await playSoft();
    if (data.placesVisited.includes(country)) {
      setData({ ...data, placesVisited: data.placesVisited.filter(c => c !== country) });
    } else {
      setData({ ...data, placesVisited: [...data.placesVisited, country] });
    }
  };

  const toggleLanguage = async (language: string) => {
    await playSoft();
    if (data.languages.includes(language)) {
      setData({ ...data, languages: data.languages.filter(l => l !== language) });
    } else {
      setData({ ...data, languages: [...data.languages, language] });
    }
  };

  const toggleTravelStyle = async (style: string) => {
    await playSoft();
    if (data.travelStyles.includes(style)) {
      setData({ ...data, travelStyles: data.travelStyles.filter(s => s !== style) });
    } else {
      setData({ ...data, travelStyles: [...data.travelStyles, style] });
    }
  };

  // Premium gradient background component
  const PremiumBackground = () => (
    <LinearGradient
      colors={['#0a0a0a', '#000000', '#0f0f0f', '#000000']}
      locations={[0, 0.33, 0.66, 1]}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
      }}
    />
  );

  // Loading overlay shown while completing onboarding
  if (isCompletingOnboarding) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient
          colors={['#0a0a0a', '#000000', '#0f0f0f', '#000000']}
          locations={[0, 0.33, 0.66, 1]}
          style={{ position: 'absolute', top: 0, left: 0, width, height }}
        />
        <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
          <Animated.View entering={ZoomIn.delay(200).springify()} style={{ marginBottom: 32 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: 'rgba(45,90,69,0.3)',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderColor: 'rgba(74,157,110,0.4)',
            }}>
              <ActivityIndicator size="large" color="#4a9d6e" />
            </View>
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.delay(300).springify()}
            style={{ color: '#f5f5f0', fontSize: 22, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 }}
          >
            Setting up your profile
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(450).springify()}
            style={{ color: '#9ca396', fontSize: 15, textAlign: 'center', paddingHorizontal: 40 }}
          >
            Finding your travel matches...
          </Animated.Text>
        </Animated.View>
      </View>
    );
  }

  // Intro animation — shown before access code
  if (showIntro) {
    return <OnboardingIntroSlide onAccessCode={() => setShowIntro(false)} startAtCTA={introStartAtCTA} />;
  }

  // Slide 0: Access Code
  if (currentSlide === 0) {
    const handleAccessCodeSubmit = () => {
      if (accessCode === '0371') {
        setAccessCodeError(false);
        setIntroStartAtCTA(false);
        playSuccess();
        setCurrentSlide(2);
      } else {
        setAccessCodeError(true);
        playHeavy();
      }
    };

    return (
      <View className="flex-1 bg-black">
        <PremiumBackground />
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-center items-center px-8">
            <Animated.View entering={FadeInDown.delay(200).springify()} className="items-center mb-12">
              <Lock size={64} color="#10b981" strokeWidth={1.5} />
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(400).springify()} className="items-center mb-8">
              <Text className="text-3xl font-bold text-white mb-2">Access Code</Text>
              <Text className="text-base text-gray-400 text-center">
                Enter the code to continue
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(600).springify()} className="w-full mb-6">
              <TextInput
                value={accessCode}
                onChangeText={(text) => {
                  setAccessCode(text);
                  setAccessCodeError(false);
                }}
                onSubmitEditing={handleAccessCodeSubmit}
                placeholder="Enter code"
                placeholderTextColor="#6b7280"
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                className={`bg-white/10 rounded-2xl px-6 py-4 text-white text-center text-2xl font-semibold tracking-widest ${
                  accessCodeError ? 'border-2 border-red-500' : 'border-2 border-transparent'
                }`}
                style={{
                  shadowColor: accessCodeError ? '#ef4444' : '#10b981',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: accessCodeError ? 0.3 : 0.1,
                  shadowRadius: 8,
                }}
              />
              {accessCodeError && (
                <Animated.View entering={FadeIn.springify()} className="mt-3">
                  <Text className="text-red-500 text-center text-sm font-medium">
                    Please try again
                  </Text>
                </Animated.View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(800).springify()} className="w-full">
              <Pressable
                onPress={handleAccessCodeSubmit}
                className="bg-emerald-500 rounded-2xl px-8 py-4 active:opacity-80"
                style={{
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              >
                <Text className="text-white text-center text-lg font-bold">
                  Continue
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(1200)} style={{ marginTop: 24, alignItems: 'center' }}>
              <Pressable
                onPress={() => {
                  setIntroStartAtCTA(true);
                  setShowIntro(true);
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, textAlign: 'center', textDecorationLine: 'underline', fontFamily: 'Outfit-Regular' }}>
                  Don't have access? Get notified when we launch
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 2: TAG ALONG Premium Intro with Full-Screen Images
  if (currentSlide === 2) {
    const p1Url = getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P1.jpeg');
    const p2Url = getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P2.jpeg');
    const p3Url = getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P3.jpeg');

    return (
      <View className="flex-1 bg-black">
        {/* Full-screen image grid */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Top image - takes up ~40% of screen */}
          <Animated.View
            entering={FadeIn.delay(100).duration(600)}
            style={{ flex: 4 }}
          >
            <Image
              source={{ uri: p1Url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Bottom row - two images side by side, each ~30% of screen */}
          <View style={{ flex: 6, flexDirection: 'row' }}>
            <Animated.View
              entering={FadeIn.delay(300).duration(600)}
              style={{ flex: 1 }}
            >
              <Image
                source={{ uri: p2Url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </Animated.View>
            <Animated.View
              entering={FadeIn.delay(500).duration(600)}
              style={{ flex: 1 }}
            >
              <Image
                source={{ uri: p3Url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </Animated.View>
          </View>
        </View>

        {/* Dark overlay for text visibility */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
          locations={[0, 0.3, 0.6, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-end px-6 pb-8">
            {/* Premium typing text */}
            <Animated.View
              entering={FadeInUp.delay(800).springify()}
              className="mb-8"
            >
              <Text
                className="text-white text-3xl font-bold leading-tight"
                style={{
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 8,
                }}
              >
                {typingText}
                <Text className="text-emerald-400">|</Text>
              </Text>
            </Animated.View>

            {/* Continue button */}
            <Animated.View entering={FadeInUp.delay(1200).springify()}>
              <Pressable
                onPress={handleContinue}
                className="bg-emerald-500 py-5 rounded-2xl active:opacity-80"
                style={{
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                }}
              >
                <Text className="text-white text-lg font-bold text-center">
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 3: Active Users
  if (currentSlide === 3) {
    return (
      <View className="flex-1 bg-black">
        {/* Full-screen image grid background */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Top image */}
          <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ flex: 4 }}>
            <Image
              source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20ON%201.jpg') }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </Animated.View>
          {/* Bottom row - two images side by side */}
          <View style={{ flex: 6, flexDirection: 'row' }}>
            <Animated.View entering={FadeIn.delay(300).duration(600)} style={{ flex: 1 }}>
              <Image
                source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%202.jpg') }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </Animated.View>
            <Animated.View entering={FadeIn.delay(500).duration(600)} style={{ flex: 1 }}>
              <Image
                source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%203.jpg') }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </Animated.View>
          </View>
        </View>

        {/* Dark gradient overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.98)']}
          locations={[0, 0.3, 0.65, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-end items-center px-8 pb-4">
            <Animated.Text
              entering={FadeInUp.delay(500).springify()}
              className="text-7xl font-bold text-white mt-4"
            >
              {activeUsers.toLocaleString()}
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(500).springify()}
              className="text-2xl font-semibold text-emerald-400 mt-6"
            >
              Active Travelers
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(700).springify()}
              className="text-base text-white/70 mt-4 text-center leading-6"
            >
              Join thousands of adventurers looking for their perfect travel companion right now
            </Animated.Text>
          </View>
          <Animated.View entering={FadeInUp.delay(900).springify()} className="px-6 pb-6">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                className="bg-emerald-500 py-5 rounded-2xl active:opacity-80"
              >
                <Text className="text-white text-lg font-semibold text-center">
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 4: Sign In — Full Premium Redesign
  if (currentSlide === 4) {
    const bgImage = getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P1.jpeg');

    // TagAlong hiker icon — two hikers with backpacks and poles
    const TagAlongIcon = () => (
      <Svg width={32} height={32} viewBox="0 0 100 100" fill="none">
        {/* Hiker 1 (left, larger) */}
        {/* Head */}
        <Path d="M28 10 a7 7 0 1 1 0.01 0 Z" fill="#ffffff" />
        {/* Backpack */}
        <Path d="M22 22 Q18 22 17 30 L17 42 Q17 44 19 44 L27 44 Q29 44 29 42 L29 24 Q29 22 27 22 Z" fill="#ffffff" />
        {/* Body */}
        <Path d="M30 22 L34 22 Q36 22 36 24 L36 42 Q36 44 34 44 L30 44 Z" fill="#ffffff" />
        {/* Left leg */}
        <Path d="M29 44 L24 62 Q23 65 25 66 L28 67 Q30 67 31 64 L34 50 Z" fill="#ffffff" />
        {/* Right leg */}
        <Path d="M33 44 L36 62 Q37 65 40 64 L42 62 Q43 60 42 57 L37 44 Z" fill="#ffffff" />
        {/* Pole (left hand) */}
        <Path d="M20 28 L14 65" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        {/* Left arm */}
        <Path d="M29 26 L21 30 Q19 31 20 33 L21 35 Q22 36 24 35 L30 31 Z" fill="#ffffff" />

        {/* Hiker 2 (right, slightly smaller/behind) */}
        {/* Head */}
        <Path d="M63 14 a6 6 0 1 1 0.01 0 Z" fill="#ffffff" />
        {/* Backpack */}
        <Path d="M57 25 Q53 25 52 32 L52 43 Q52 45 54 45 L61 45 Q63 45 63 43 L63 27 Q63 25 61 25 Z" fill="#ffffff" />
        {/* Body */}
        <Path d="M64 25 L68 25 Q70 25 70 27 L70 43 Q70 45 68 45 L64 45 Z" fill="#ffffff" />
        {/* Left leg */}
        <Path d="M63 45 L58 61 Q57 64 59 65 L62 66 Q64 66 65 63 L68 50 Z" fill="#ffffff" />
        {/* Right leg */}
        <Path d="M67 45 L70 60 Q71 63 74 62 L76 60 Q77 58 76 55 L71 45 Z" fill="#ffffff" />
        {/* Pole (left hand) */}
        <Path d="M55 31 L49 65" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        {/* Left arm */}
        <Path d="M63 29 L56 33 Q54 34 55 36 L56 38 Q57 39 59 38 L64 33 Z" fill="#ffffff" />
      </Svg>
    );

    // Apple logo SVG — pass dark={true} for black icon on white background
    const AppleLogo = ({ dark }: { dark?: boolean } = {}) => (
      <Svg width={20} height={20} viewBox="0 0 814 1000" fill="white">
        <Path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.2 0 663.1 0 541.8 0 347.4 96.5 250.4 240.2 250.4c75.8 0 138.5 42.8 185.4 42.8 44.5 0 114.9-45.9 199.5-45.9zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
      </Svg>
    );

    // Google G logo SVG
    const GoogleLogo = () => (
      <Svg width={20} height={20} viewBox="0 0 488 512">
        <Path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" fill="#4285F4"/>
      </Svg>
    );

    return (
      <View style={{ flex: 1, backgroundColor: '#0a0d0b' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >

          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>TagAlong</Text>
            <TouchableOpacity onPress={() => setCurrentSlide(currentSlide + 1)}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' }}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Center — travel headline */}
          <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
            <Text style={{ color: '#ffffff', fontSize: 38, fontWeight: '900', textAlign: 'center', letterSpacing: -1, lineHeight: 44, marginBottom: 12 }}>
              Your next adventure awaits.
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
              Join thousands of travelers exploring the world together
            </Text>
          </View>

          {/* Bottom — sign-in buttons */}
          <View style={{ paddingBottom: 32 }}>

            {authError && (
              <View style={{ backgroundColor: '#ef4444', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <Text style={{ color: '#fff', textAlign: 'center', fontSize: 14, fontWeight: '600' }}>{authError}</Text>
              </View>
            )}

            {/* Apple button */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={handleAppleSignIn}
                disabled={isAuthenticating}
                activeOpacity={0.8}
                style={{ marginBottom: 14 }}
              >
                <View style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 50,
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  {isAuthenticating ? (
                    <ActivityIndicator size="small" color="#000" style={{ flex: 1 }} />
                  ) : (
                    <>
                      <View style={{ width: 36, alignItems: 'center' }}>
                        <AppleLogo />
                      </View>
                      <Text style={{ flex: 1, color: '#000000', fontSize: 17, fontWeight: '700', textAlign: 'center', marginRight: 36 }}>
                        Continue with Apple
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* Google button */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={isAuthenticating}
              activeOpacity={0.8}
              style={{ marginBottom: 20 }}
            >
              <View style={{
                backgroundColor: '#ffffff',
                borderRadius: 50,
                paddingVertical: 18,
                paddingHorizontal: 24,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                {isAuthenticating ? (
                  <ActivityIndicator size="small" color="#000" style={{ flex: 1 }} />
                ) : (
                  <>
                    <View style={{ width: 36, alignItems: 'center' }}>
                      <GoogleLogo />
                    </View>
                    <Text style={{ flex: 1, color: '#000000', fontSize: 17, fontWeight: '700', textAlign: 'center', marginRight: 36 }}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
              By continuing you agree to our Terms of Service{'\n'}and Privacy Policy
            </Text>

            {/* Email sign-in form */}
            {showEmailForm ? (
              <View style={{ marginTop: 16, gap: 10 }}>
                <View style={{
                  backgroundColor: '#1c1c1e',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.15)',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}>
                  <TextInput
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{ color: '#ffffff', fontSize: 15 }}
                  />
                </View>
                <View style={{
                  backgroundColor: '#1c1c1e',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.15)',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}>
                  <TextInput
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                    style={{ color: '#ffffff', fontSize: 15 }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => handleEmailSignIn(emailInput, passwordInput)}
                  disabled={isAuthenticating || !emailInput || !passwordInput}
                  activeOpacity={0.8}
                >
                  <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 50,
                    paddingVertical: 16,
                    alignItems: 'center',
                  }}>
                    {isAuthenticating
                      ? <ActivityIndicator color="#000" />
                      : <Text style={{ color: '#000', fontSize: 16, fontWeight: '700' }}>Sign in</Text>
                    }
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowEmailForm(false)} style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowEmailForm(true)}
                style={{ alignItems: 'center', paddingTop: 16 }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
                  Sign in with email
                </Text>
              </TouchableOpacity>
            )}

          </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 5: Name & Birthday
  if (currentSlide === 5) {
    return (
      <View className="flex-1 bg-black">
        <PremiumBackground />
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          {/* Skip button — top right */}
          <Animated.View entering={FadeIn.delay(400)} style={{ position: 'absolute', top: 56, right: 20, zIndex: 10 }}>
            <Pressable
              onPress={() => setCurrentSlide(currentSlide + 1)}
              style={({ pressed }) => ({
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: 50,
                paddingHorizontal: 18,
                paddingVertical: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>Skip</Text>
            </Pressable>
          </Animated.View>

          <View className="flex-1 px-6 justify-center">
            <Animated.Text entering={FadeInLeft.delay(100).springify()} className="text-4xl font-bold text-white mb-2">Basic Info</Animated.Text>
            <Animated.Text entering={FadeInLeft.delay(200).springify()} className="text-lg text-emerald-400 mb-12">
              Let's get started with your profile
            </Animated.Text>

            <Animated.View entering={FadeInUp.delay(300).springify()} className="mb-6">
              <Text className="text-white text-sm font-semibold mb-3 ml-1">Your Name</Text>
              <View className="bg-white/5 border border-white/10 rounded-2xl px-5 py-5 flex-row items-center">
                <UserIcon size={22} color="#10b981" />
                <TextInput
                  value={localName}
                  onChangeText={setLocalName}
                  onBlur={() => setData({ ...data, name: localName })}
                  placeholder="Enter your name"
                  placeholderTextColor="#6b7280"
                  className="flex-1 text-white text-lg ml-4"
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(500).springify()} className="mb-6">
              <View className="flex-row items-center justify-between mb-3 ml-1 mr-1">
                <Text className="text-white text-sm font-semibold">Birthday</Text>
                <Text className="text-emerald-400 text-xs">Verifies you're 16+ for safety</Text>
              </View>
              <Pressable
                onPress={async () => {
                  await playSoft();
                  setTempBirthday(data.birthday || new Date(2000, 0, 1));
                  setShowDatePicker(true);
                }}
                className="bg-white/5 border border-white/10 rounded-2xl px-5 py-5 flex-row items-center"
              >
                <Calendar size={22} color="#10b981" />
                <Text className={`flex-1 text-lg ml-4 ${data.birthday ? 'text-white' : 'text-gray-500'}`}>
                  {data.birthday ? data.birthday.toLocaleDateString() : 'Select your birthday'}
                </Text>
              </Pressable>
            </Animated.View>

            {/* Birthday Date Picker Modal */}
            {showDatePicker && (
              <Pressable
                className="absolute inset-0 bg-black/70 justify-center items-center"
                onPress={() => setShowDatePicker(false)}
              >
                <Pressable
                  onPress={(e) => e.stopPropagation()}
                  className="bg-neutral-900 rounded-3xl p-6 mx-6 w-4/5"
                >
                  <Text className="text-white text-xl font-bold mb-4 text-center">Select Your Birthday</Text>

                  <DateTimePicker
                    value={tempBirthday || new Date(2000, 0, 1)}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setTempBirthday(selectedDate);
                      }
                    }}
                    maximumDate={new Date()}
                    textColor="#ffffff"
                  />

                  <View className="flex-row mt-4 gap-3">
                    <Pressable
                      onPress={async () => {
                        await playSoft();
                        setShowDatePicker(false);
                        setTempBirthday(null);
                      }}
                      className="flex-1 bg-white/10 py-4 rounded-2xl active:opacity-70"
                    >
                      <Text className="text-white text-center font-semibold">Cancel</Text>
                    </Pressable>

                    <Pressable
                      onPress={async () => {
                        await playHeavy();
                        if (tempBirthday) {
                          setData({ ...data, birthday: tempBirthday });
                        }
                        setShowDatePicker(false);
                        setTempBirthday(null);
                      }}
                      className="flex-1 bg-emerald-500 py-4 rounded-2xl active:opacity-70"
                    >
                      <Text className="text-white text-center font-semibold">Done</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Pressable>
            )}
          </View>

          <Animated.View entering={FadeInUp.delay(700).springify()} className="px-6 pb-6">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-5 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/5'}`}
              >
                <Text className={`text-lg font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-600'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>

            {/* Age validation error message */}
            {localName.trim() !== '' && data.birthday !== null && calculateAge(data.birthday) < 16 && (
              <Animated.View entering={FadeInUp.delay(100)} className="mt-3">
                <Text className="text-red-400 text-sm text-center font-medium">
                  Must be 16 or older to use the app
                </Text>
              </Animated.View>
            )}
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 6: Country & City
  if (currentSlide === 6) {
    return (
      <View className="flex-1 bg-black">
        <PremiumBackground />
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          {/* Skip button — top right */}
          <Animated.View entering={FadeIn.delay(400)} style={{ position: 'absolute', top: 56, right: 20, zIndex: 10 }}>
            <Pressable
              onPress={() => setCurrentSlide(currentSlide + 1)}
              style={({ pressed }) => ({
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: 50,
                paddingHorizontal: 18,
                paddingVertical: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>Skip</Text>
            </Pressable>
          </Animated.View>

          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              className="flex-1 px-6"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.Text entering={FadeInDown.delay(100).springify()} className="text-4xl font-bold text-white mb-2 mt-8">Where are you from?</Animated.Text>
              <Animated.Text entering={FadeInDown.delay(200).springify()} className="text-lg text-emerald-400 mb-6">
                Help others find local travel companions
              </Animated.Text>

              <Animated.View entering={FadeInUp.delay(300).springify()} className="mb-4">
                <View className="flex-row items-center justify-between mb-3 ml-1 mr-1">
                  <Text className="text-white text-sm font-semibold">Country</Text>
                  <Text className="text-emerald-400 text-xs">Shows you nearby trips</Text>
                </View>
                <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 flex-row items-center mb-3">
                  <Search size={20} color="#6b7280" />
                  <TextInput
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    placeholder="Search country..."
                    placeholderTextColor="#6b7280"
                    className="flex-1 text-white text-base ml-3"
                  />
                </View>
                <ScrollView className="max-h-40 bg-white/5 rounded-2xl" showsVerticalScrollIndicator={false}>
                  {filteredCountries.map((country) => (
                    <Pressable
                      key={country.name}
                      onPress={async () => {
                        await playSoft();
                        setData({ ...data, country: country.name, city: '' });
                        setCountrySearch('');
                      }}
                      className={`px-5 py-4 flex-row items-center border-b border-white/5 ${data.country === country.name ? 'bg-emerald-500/20' : ''}`}
                    >
                      <Text className="text-3xl mr-3">{country.flag}</Text>
                      <Text className="text-white text-base font-medium">{country.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Animated.View>

              {data.country && (
                <Animated.View entering={FadeInUp.delay(100).springify()} className="mb-4">
                  <View className="flex-row items-center justify-between mb-3 ml-1 mr-1">
                    <Text className="text-white text-sm font-semibold">City</Text>
                    <Text className="text-emerald-400 text-xs">Matches you with local travelers</Text>
                  </View>
                  <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 flex-row items-center mb-3">
                    <MapPin size={20} color="#6b7280" />
                    <TextInput
                      value={data.city}
                      onChangeText={(text) => {
                        setData({ ...data, city: text });
                        setCitySearch(text);
                      }}
                      placeholder="Type or search your city..."
                      placeholderTextColor="#6b7280"
                      className="flex-1 text-white text-base ml-3"
                    />
                  </View>
                  {filteredCities.length > 0 && citySearch.length > 0 && (
                    <ScrollView className="max-h-32 bg-white/5 rounded-2xl" showsVerticalScrollIndicator={false}>
                      {filteredCities.slice(0, 5).map((city) => (
                        <Pressable
                          key={city}
                          onPress={async () => {
                            await playSoft();
                            setData({ ...data, city });
                            setCitySearch('');
                          }}
                          className={`px-5 py-4 border-b border-white/5 ${data.city === city ? 'bg-emerald-500/20' : ''}`}
                        >
                          <Text className="text-white text-base font-medium">{city}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </Animated.View>
              )}

              {/* Add spacing at bottom to ensure content is visible */}
              <View className="h-24" />
            </ScrollView>

            <Animated.View entering={FadeInUp.delay(500).springify()} className="px-6 pb-6">
              <Animated.View style={buttonAnimatedStyle}>
                <Pressable
                  onPress={handleContinue}
                  disabled={!canContinue()}
                  className={`py-5 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/5'}`}
                >
                  <Text className={`text-lg font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-600'}`}>
                    Continue
                  </Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 7: Commitment Screen — Interactive card drill-down
  if (currentSlide === 7) {
    const bgUrl = getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P8.jpg');

    const CARDS = [
      {
        icon: '🗺️',
        title: 'Trips built for you',
        desc: 'We match you to real trips that fit your style, pace, and dates.',
        delay: 400,
        detailTitle: 'Smart Trip Matching',
        detailSubtitle: 'Every trip you see is tailored to you — not a random list.',
        detailPoints: [
          { icon: '📅', label: 'Dates that work', desc: 'We only surface trips that fit your schedule.' },
          { icon: '🎯', label: 'Style filtered', desc: 'Adventure, chill, cultural — matched to your vibe.' },
          { icon: '✅', label: 'Real travelers', desc: 'Every trip has verified people, not empty profiles.' },
        ],
      },
      {
        icon: '👥',
        title: 'Your kind of traveler',
        desc: 'Find people who explore the same way you do — no awkward mismatches.',
        delay: 580,
        detailTitle: 'Your Travel DNA',
        detailSubtitle: "We map your personality so you meet people who actually click.",
        detailPoints: [
          { icon: '⚡', label: 'Energy match', desc: 'Introvert or extrovert — find people on your wavelength.' },
          { icon: '🏔️', label: 'Pace aligned', desc: 'Slow explorer or go-go-go? We match your rhythm.' },
          { icon: '🤝', label: 'Values first', desc: 'Budget, luxury, culture — matched before you even chat.' },
        ],
      },
      {
        icon: '⚡',
        title: 'Instant connections',
        desc: 'Skip the intros. Your profile does the talking.',
        delay: 760,
        detailTitle: 'Zero Cold Intros',
        detailSubtitle: 'Your profile breaks the ice so conversations start warm.',
        detailPoints: [
          { icon: '💬', label: 'Context built-in', desc: 'They already know your style before saying hello.' },
          { icon: '🔒', label: 'Safe by design', desc: 'Verified profiles only — no mystery accounts.' },
          { icon: '🌍', label: 'Global community', desc: '1,400+ travelers from 40+ countries on TagAlong.' },
        ],
      },
    ];

    const CommitmentScreen = () => {
      const [activeCard, setActiveCard] = useState<number | null>(null);

      const progressAnim = useSharedValue(0);
      const labelAnim = useSharedValue(0);
      const ctaAnim = useSharedValue(0);
      // Overlay: x position (slides from right) + scale (grows as it arrives) + opacity
      const overlayX = useSharedValue(width);
      const overlayScale = useSharedValue(0.94);
      const overlayOpacity = useSharedValue(0);

      // Main view: scales back + dims when detail is open (like iOS push navigation)
      const mainScale = useSharedValue(1);
      const mainOpacity = useSharedValue(1);

      useEffect(() => {
        labelAnim.value = withDelay(200, withTiming(1, { duration: 500 }));
        progressAnim.value = withDelay(1000, withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }));
        ctaAnim.value = withDelay(1300, withSpring(1, { damping: 12, stiffness: 120 }));
      }, []);

      useEffect(() => {
        const SPRING = { damping: 22, stiffness: 200, mass: 0.8 };
        if (activeCard !== null) {
          // Detail slides in: x 0, scale 1→1, opacity 0→1
          overlayX.value = withSpring(0, SPRING);
          overlayScale.value = withSpring(1, { damping: 20, stiffness: 180 });
          overlayOpacity.value = withTiming(1, { duration: 180 });
          // Main view pushes back slightly
          mainScale.value = withSpring(0.94, { damping: 20, stiffness: 180 });
          mainOpacity.value = withTiming(0.35, { duration: 260 });
        } else {
          // Detail exits: x slides right, scale shrinks back, fades
          overlayX.value = withSpring(width, { ...SPRING, stiffness: 240 });
          overlayScale.value = withTiming(0.94, { duration: 260, easing: Easing.out(Easing.quad) });
          overlayOpacity.value = withTiming(0, { duration: 200 });
          // Main snaps back
          mainScale.value = withSpring(1, { damping: 18, stiffness: 200 });
          mainOpacity.value = withTiming(1, { duration: 240 });
        }
      }, [activeCard]);

      const progressBarStyle = useAnimatedStyle(() => ({
        width: `${progressAnim.value * 100}%`,
      }));

      const labelStyle = useAnimatedStyle(() => ({
        opacity: labelAnim.value,
        transform: [{ translateY: interpolate(labelAnim.value, [0, 1], [12, 0]) }],
      }));

      const ctaStyle = useAnimatedStyle(() => ({
        opacity: ctaAnim.value,
        transform: [{ scale: ctaAnim.value }],
      }));

      // Main view animates back when overlay opens
      const mainViewStyle = useAnimatedStyle(() => ({
        transform: [{ scale: mainScale.value }],
        opacity: mainOpacity.value,
        borderRadius: interpolate(mainScale.value, [0.94, 1], [20, 0]),
      }));

      // Overlay: translates in from right + scales up + fades in
      const overlayStyle = useAnimatedStyle(() => ({
        transform: [
          { translateX: overlayX.value },
          { scale: overlayScale.value },
        ],
        opacity: overlayOpacity.value,
        // Rounded corners pop in as it arrives
        borderRadius: interpolate(overlayScale.value, [0.94, 1], [28, 0]),
        overflow: 'hidden',
      }));

      const card = activeCard !== null ? CARDS[activeCard] : null;

      return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Background */}
          <Animated.View entering={FadeIn.duration(700)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <Image source={{ uri: bgUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </Animated.View>
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.88)', 'rgba(0,0,0,1)']}
            locations={[0, 0.3, 0.58, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <Animated.View style={[mainViewStyle, { flex: 1 }]}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <View style={{ flex: 1, paddingHorizontal: 22 }}>

              {/* ── MAIN VIEW — always rendered, always visible ── */}
              <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 20 }}>

                {/* "One last thing" label */}
                <Animated.View style={[labelStyle, { marginBottom: 8 }]}>
                  <Text style={{
                    fontSize: 12, fontWeight: '800', letterSpacing: 2.5,
                    color: '#10b981', textTransform: 'uppercase',
                    textShadowColor: 'rgba(0,0,0,0.8)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}>
                    One last thing
                  </Text>
                </Animated.View>

                {/* Headline */}
                <Animated.View entering={FadeInUp.delay(250).duration(600).springify()} style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff', lineHeight: 40, letterSpacing: -0.8 }}>
                    {"Let's build your\ntravel profile."}
                  </Text>
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 7, lineHeight: 20 }}>
                    Answer 8 quick questions. Takes about 2 minutes.
                  </Text>
                </Animated.View>

                {/* Cards — always visible, static styles (no function style bug) */}
                {CARDS.map((c, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInUp.delay(c.delay).springify().damping(14)}
                    style={{ marginBottom: 10 }}
                  >
                    <Pressable
                      onPress={async () => {
                        await playSoft();
                        setActiveCard(i);
                      }}
                      android_ripple={{ color: 'rgba(16,185,129,0.15)' }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.11)',
                        borderRadius: 18,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Green left accent stripe */}
                      <View style={{ width: 4, alignSelf: 'stretch', backgroundColor: '#10b981' }} />
                      {/* Icon */}
                      <View style={{ paddingHorizontal: 14, paddingVertical: 15 }}>
                        <Text style={{ fontSize: 24 }}>{c.icon}</Text>
                      </View>
                      {/* Text */}
                      <View style={{ flex: 1, paddingRight: 12, paddingVertical: 13 }}>
                        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700', marginBottom: 2 }}>{c.title}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 16 }}>{c.desc}</Text>
                      </View>
                      {/* Chevron */}
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, paddingRight: 16, fontWeight: '300' }}>›</Text>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>

              {/* ── FIXED BOTTOM — always visible ── */}
              <View style={{ paddingBottom: 12 }}>
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
                      YOUR PROFILE
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700' }}>~2 min</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                    <Animated.View style={[progressBarStyle, { height: '100%', backgroundColor: '#10b981', borderRadius: 99 }]} />
                  </View>
                </View>
                <Animated.View style={ctaStyle}>
                  <Pressable
                    onPress={handleContinue}
                    style={{
                      backgroundColor: '#10b981',
                      borderRadius: 20,
                      paddingVertical: 19,
                      alignItems: 'center',
                      shadowColor: '#10b981',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.6,
                      shadowRadius: 24,
                      elevation: 12,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 }}>
                      {"Let's Go →"}
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>

            </View>
          </SafeAreaView>
          </Animated.View>

          {/* ── DETAIL OVERLAY — premium multi-axis transition ── */}
          <Animated.View style={[overlayStyle, {
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#000',
          }]}>
            {/* Same background photo */}
            <Image source={{ uri: bgUrl }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.93)', 'rgba(0,0,0,1)']}
              locations={[0, 0.25, 0.55, 1]}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {card && (
              <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <View style={{ flex: 1, paddingHorizontal: 22, justifyContent: 'flex-end', paddingBottom: 20 }}>

                  {/* Back pill */}
                  <Pressable
                    onPress={async () => { await playSoft(); setActiveCard(null); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
                      borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8,
                      marginBottom: 32,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>‹ Back</Text>
                  </Pressable>

                  {/* Big icon box */}
                  <View style={{
                    width: 72, height: 72, borderRadius: 22,
                    backgroundColor: 'rgba(16,185,129,0.15)',
                    borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 18,
                  }}>
                    <Text style={{ fontSize: 36 }}>{card.icon}</Text>
                  </View>

                  {/* Detail headline */}
                  <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 36, marginBottom: 8 }}>
                    {card.detailTitle}
                  </Text>
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 28 }}>
                    {card.detailSubtitle}
                  </Text>

                  {/* Detail points */}
                  {card.detailPoints.map((pt, pi) => (
                    <View
                      key={pi}
                      style={{
                        flexDirection: 'row', alignItems: 'flex-start',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
                        borderRadius: 16, padding: 16, marginBottom: 10,
                      }}
                    >
                      <Text style={{ fontSize: 22, marginRight: 14, marginTop: 1 }}>{pt.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 3 }}>{pt.label}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 18 }}>{pt.desc}</Text>
                      </View>
                    </View>
                  ))}

                  {/* Progress + CTA pinned at bottom of overlay too */}
                  <View style={{ marginTop: 24 }}>
                    <View style={{ marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>YOUR PROFILE</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700' }}>~2 min</Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                        <Animated.View style={[progressBarStyle, { height: '100%', backgroundColor: '#10b981', borderRadius: 99 }]} />
                      </View>
                    </View>
                    <Pressable
                      onPress={handleContinue}
                      style={{
                        backgroundColor: '#10b981', borderRadius: 20, paddingVertical: 19,
                        alignItems: 'center', shadowColor: '#10b981',
                        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 12,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 }}>{"Let's Go →"}</Text>
                    </Pressable>
                  </View>

                </View>
              </SafeAreaView>
            )}
          </Animated.View>

        </View>
      );
    };

    return <CommitmentScreen />;
  }

  // Slide 8: Gender
  if (currentSlide === 8) {
    const genderOptions = [
      { id: 'male', label: 'Male', emoji: '👨' },
      { id: 'female', label: 'Female', emoji: '👩' },
      { id: 'other', label: 'Other', emoji: '🧑' },
    ];

    return (
      <View className="flex-1 bg-black">
        {/* Full-screen background image */}
        <Image source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p11.jpeg') }} style={{ position: 'absolute', top: 0, left: 0, width, height }} resizeMode="cover" />
        {/* Subtle dark scrim + heavy fade at bottom */}
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)', '#000000']} locations={[0, 0.55, 0.82, 1]} style={{ position: 'absolute', top: 0, left: 0, width, height }} />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-center px-5">
            <Animated.View entering={FadeInUp.delay(100).springify()} style={{ backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24 }}>
              <Animated.Text entering={FadeInLeft.delay(150).springify()} className="text-2xl font-bold text-white mb-1 text-center">What's your gender?</Animated.Text>
              <Animated.Text entering={FadeInLeft.delay(220).springify()} className="text-sm text-emerald-400 mb-6 text-center">
                Help us create better matches
              </Animated.Text>

              {genderOptions.map((option, index) => (
                <Animated.View key={option.id} entering={FadeInUp.delay(320 + index * 100).springify()}>
                  <Pressable
                    onPress={async () => {
                      await playHeavy();
                      setData({ ...data, gender: option.id as 'male' | 'female' | 'other' });
                    }}
                    className={`mb-3 py-4 px-5 rounded-2xl border flex-row items-center ${
                      data.gender === option.id
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-white/8 border-white/12'
                    } active:opacity-80`}
                  >
                    <Text className="text-2xl mr-4">{option.emoji}</Text>
                    <Text className="text-white text-base font-semibold flex-1">{option.label}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(650).springify()} className="px-5 pb-6 pt-3">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-4 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/10'}`}
              >
                <Text className={`text-base font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-500'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 9: Travel Partner Preference
  if (currentSlide === 9) {
    const travelWithOptions = [
      { id: 'male', label: 'Male', emoji: '👨' },
      { id: 'female', label: 'Female', emoji: '👩' },
      { id: 'everyone', label: 'Everyone', emoji: '👥' },
    ];

    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p12.jpeg') }} style={{ position: 'absolute', top: 0, left: 0, width, height }} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)', '#000000']} locations={[0, 0.55, 0.82, 1]} style={{ position: 'absolute', top: 0, left: 0, width, height }} />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-center px-5">
            <Animated.View entering={FadeInUp.delay(100).springify()} style={{ backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24 }}>
              <Animated.Text entering={FadeInLeft.delay(150).springify()} className="text-2xl font-bold text-white mb-1 text-center">Who do you want to travel with?</Animated.Text>
              <Animated.Text entering={FadeInLeft.delay(220).springify()} className="text-sm text-emerald-400 mb-6 text-center">
                Choose your preferred travel companions
              </Animated.Text>

              {travelWithOptions.map((option, index) => (
                <Animated.View key={option.id} entering={FadeInUp.delay(320 + index * 100).springify()}>
                  <Pressable
                    onPress={async () => {
                      await playHeavy();
                      setData({ ...data, travelWith: option.id as 'male' | 'female' | 'everyone' });
                    }}
                    className={`mb-3 py-4 px-5 rounded-2xl border flex-row items-center ${
                      data.travelWith === option.id
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-white/8 border-white/12'
                    } active:opacity-80`}
                  >
                    <Text className="text-2xl mr-4">{option.emoji}</Text>
                    <Text className="text-white text-base font-semibold flex-1">{option.label}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(650).springify()} className="px-5 pb-6 pt-3">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-4 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/10'}`}
              >
                <Text className={`text-base font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-500'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 10: Bio
  if (currentSlide === 10) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-black">
        <Image source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p13.jpeg') }} style={{ position: 'absolute', top: 0, left: 0, width, height }} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)', '#000000']} locations={[0, 0.55, 0.82, 1]} style={{ position: 'absolute', top: 0, left: 0, width, height }} />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          {/* Skip button */}
          <Animated.View entering={FadeIn.delay(500)} className="absolute top-0 right-0 z-10 pt-14 pr-5">
            <Pressable onPress={handleContinue} className="py-2 px-4 rounded-full bg-black/40 active:opacity-60">
              <Text className="text-white text-sm font-medium">Skip</Text>
            </Pressable>
          </Animated.View>

          <View className="flex-1 justify-center px-5">
            <Animated.View entering={FadeInUp.delay(100).springify()} style={{ backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24 }}>
              <Animated.View entering={FadeInLeft.delay(150).springify()} className="flex-row items-center justify-center mb-1">
                <Text className="text-xl mr-2">✍️</Text>
                <Text className="text-2xl font-bold text-white">Tell us about yourself</Text>
              </Animated.View>
              <Animated.Text entering={FadeInLeft.delay(220).springify()} className="text-sm text-emerald-400 mb-5 text-center">
                Share what travelers should know about you
              </Animated.Text>

              <Animated.View entering={FadeInUp.delay(350).springify()} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16 }}>
                <View className="flex-row items-center mb-3">
                  <Edit3 size={14} color="#10b981" />
                  <Text className="text-emerald-400 text-xs font-semibold ml-2">Your Bio (min 20 characters)</Text>
                </View>
                <TextInput
                  value={data.bio}
                  onChangeText={(text) => setData({ ...data, bio: text })}
                  placeholder="Tell others about your travel style, interests, what you're looking for..."
                  placeholderTextColor="#6b7280"
                  className="text-white text-sm"
                  style={{ minHeight: 90 }}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text className="text-gray-500 text-xs mt-2 text-right">{data.bio.length}/500</Text>
              </Animated.View>
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(600).springify()} className="px-5 pb-6 pt-3">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-4 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/10'}`}
              >
                <Text className={`text-base font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-500'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
      </TouchableWithoutFeedback>
    );
  }

  // Slide 11: Places Visited
  if (currentSlide === 11) {
    return (
      <View className="flex-1 bg-black">
        <PremiumBackground />
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            <Animated.Text entering={FadeInDown.delay(100).springify()} className="text-4xl font-bold text-white mb-2 mt-8">Places you've been</Animated.Text>
            <Animated.Text entering={FadeInDown.delay(200).springify()} className="text-lg text-emerald-400 mb-6">
              Share your travel experiences
            </Animated.Text>

            <Animated.View entering={ZoomIn.delay(300).springify()} className="items-center mb-8">
              <Animated.View style={[animatedStyle]}>
                <Globe size={100} color="#10b981" strokeWidth={1.5} />
              </Animated.View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(500).springify()} className="flex-row flex-wrap justify-between mb-20">
              {VISIT_COUNTRIES.map((country) => {
                const isSelected = data.placesVisited.includes(country.name);
                return (
                  <Pressable
                    key={country.name}
                    onPress={() => toggleCountryVisit(country.name)}
                    className={`w-[48%] mb-4 rounded-2xl overflow-hidden border-2 ${
                      isSelected ? 'border-emerald-500' : 'border-white/10'
                    } active:opacity-80`}
                  >
                    <Image
                      source={{ uri: country.image }}
                      style={{ width: '100%', height: 100 }}
                      resizeMode="cover"
                    />
                    <View className={`p-3 ${isSelected ? 'bg-emerald-500' : 'bg-white/5'}`}>
                      <Text className="text-white text-sm font-semibold">
                        {country.flag} {country.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </Animated.View>
          </ScrollView>

          <Animated.View entering={FadeInUp.delay(700).springify()} className="px-6 pb-6 bg-black/50">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-5 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/5'}`}
              >
                <Text className={`text-lg font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-600'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 12: Languages
  if (currentSlide === 12) {
    return (
      <View className="flex-1 bg-black">
        <PremiumBackground />
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 px-6">
            <Animated.Text entering={FadeInDown.delay(100).springify()} className="text-4xl font-bold text-white mb-2 mt-8">What languages do you speak?</Animated.Text>
            <Animated.Text entering={FadeInDown.delay(200).springify()} className="text-lg text-emerald-400 mb-8">
              Select all that apply
            </Animated.Text>

            <ScrollView className="flex-1 mb-4" showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((language, index) => {
                const isSelected = data.languages.includes(language.name);
                return (
                  <Animated.View key={language.name} entering={FadeInRight.delay(300 + index * 80).springify()}>
                    <Pressable
                      onPress={() => toggleLanguage(language.name)}
                      className={`mb-3 py-5 px-5 rounded-2xl border flex-row items-center ${
                        isSelected ? 'bg-emerald-500 border-emerald-400' : 'bg-white/5 border-white/10'
                      } active:opacity-80`}
                    >
                      <Text className="text-3xl mr-4">{language.flag}</Text>
                      <Text className="text-white text-lg font-medium flex-1">{language.name}</Text>
                      {isSelected && <Text className="text-white text-2xl">✓</Text>}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>

          <Animated.View entering={FadeInUp.delay(800).springify()} className="px-6 pb-6">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-5 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/5'}`}
              >
                <Text className={`text-lg font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-600'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 13: Social Energy
  if (currentSlide === 13) {
    const energyTypes = [
      { id: 'introvert', label: 'Introvert', desc: 'Prefer smaller groups and quiet time', emoji: '🧘' },
      { id: 'extrovert', label: 'Extrovert', desc: 'Love meeting new people and socializing', emoji: '🎉' },
      { id: 'ambivert', label: 'Ambivert', desc: 'Balanced mix of both', emoji: '⚖️' },
    ];

    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p14.jpeg') }} style={{ position: 'absolute', top: 0, left: 0, width, height }} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)', '#000000']} locations={[0, 0.55, 0.82, 1]} style={{ position: 'absolute', top: 0, left: 0, width, height }} />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-center px-5">
            <Animated.View entering={FadeInUp.delay(100).springify()} style={{ backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24 }}>
              <Animated.Text entering={FadeInLeft.delay(150).springify()} className="text-2xl font-bold text-white mb-1 text-center">What's your social energy?</Animated.Text>
              <Animated.Text entering={FadeInLeft.delay(220).springify()} className="text-sm text-emerald-400 mb-6 text-center">
                How do you recharge?
              </Animated.Text>

              {energyTypes.map((type, index) => (
                <Animated.View key={type.id} entering={FadeInUp.delay(320 + index * 100).springify()}>
                  <Pressable
                    onPress={async () => {
                      await playHeavy();
                      setData({ ...data, socialEnergy: type.id as 'introvert' | 'extrovert' | 'ambivert' });
                    }}
                    className={`mb-3 py-4 px-5 rounded-2xl border flex-row items-center ${
                      data.socialEnergy === type.id
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-white/8 border-white/12'
                    } active:opacity-80`}
                  >
                    <Text className="text-2xl mr-4">{type.emoji}</Text>
                    <View className="flex-1">
                      <Text className="text-white text-base font-semibold">{type.label}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">{type.desc}</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(650).springify()} className="px-5 pb-6 pt-3">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-4 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/10'}`}
              >
                <Text className={`text-base font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-500'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 14: Travel Styles
  if (currentSlide === 14) {
    return (
      <View className="flex-1 bg-black">
        <PremiumBackground />
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 px-6">
            <Animated.Text entering={FadeInDown.delay(100).springify()} className="text-4xl font-bold text-white mb-2 mt-8">How do you like to travel?</Animated.Text>
            <Animated.Text entering={FadeInDown.delay(200).springify()} className="text-lg text-emerald-400 mb-8">
              Select all that apply
            </Animated.Text>

            <ScrollView className="flex-1 mb-4" showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap justify-between">
                {TRAVEL_STYLES.map((style, index) => {
                  const isSelected = data.travelStyles.includes(style.id);
                  return (
                    <Animated.View key={style.id} entering={ZoomIn.delay(300 + index * 100).springify()} className="w-[48%]">
                      <Pressable
                        onPress={() => toggleTravelStyle(style.id)}
                        className={`mb-4 py-6 rounded-2xl border items-center ${
                          isSelected ? 'bg-emerald-500 border-emerald-400' : 'bg-white/5 border-white/10'
                        } active:opacity-80`}
                      >
                        <Text className="text-4xl mb-3">{style.icon}</Text>
                        <Text className="text-white text-base font-semibold">{style.label}</Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <Animated.View entering={FadeInUp.delay(900).springify()} className="px-6 pb-6">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-5 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/5'}`}
              >
                <Text className={`text-lg font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-600'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 15: Travel Pace
  if (currentSlide === 15) {
    const paceOptions = [
      { id: 'slow', label: 'Slow and Steady', emoji: '🐢' },
      { id: 'balanced', label: 'Balanced', emoji: '⚖️' },
      { id: 'fast', label: 'GO GO GO!', emoji: '🚀' },
    ];

    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p15.jpeg') }} style={{ position: 'absolute', top: 0, left: 0, width, height }} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)', '#000000']} locations={[0, 0.55, 0.82, 1]} style={{ position: 'absolute', top: 0, left: 0, width, height }} />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-center px-5">
            <Animated.View entering={FadeInUp.delay(100).springify()} style={{ backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24 }}>
              <Animated.Text entering={FadeInLeft.delay(150).springify()} className="text-2xl font-bold text-white mb-1 text-center">What's your daily travel pace?</Animated.Text>
              <Animated.Text entering={FadeInLeft.delay(220).springify()} className="text-sm text-emerald-400 mb-6 text-center">
                How do you like to explore?
              </Animated.Text>

              {paceOptions.map((pace, index) => (
                <Animated.View key={pace.id} entering={FadeInUp.delay(320 + index * 100).springify()}>
                  <Pressable
                    onPress={async () => {
                      await playHeavy();
                      setData({ ...data, travelPace: pace.id as 'slow' | 'balanced' | 'fast' });
                    }}
                    className={`mb-3 py-4 px-5 rounded-2xl border flex-row items-center ${
                      data.travelPace === pace.id
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-white/8 border-white/12'
                    } active:opacity-80`}
                  >
                    <Text className="text-2xl mr-4">{pace.emoji}</Text>
                    <Text className="text-white text-base font-semibold flex-1">{pace.label}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(650).springify()} className="px-5 pb-6 pt-3">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-4 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/10'}`}
              >
                <Text className={`text-base font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-500'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 16: Travel Group Type
  if (currentSlide === 16) {
    const groupTypes = [
      { id: 'close-knit', label: 'Close-Knit', desc: '2-3 people I can deeply connect with', emoji: '🤝' },
      { id: 'open', label: 'Open Group', desc: 'Meet many people along the way', emoji: '🌍' },
    ];

    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p16.jpeg') }} style={{ position: 'absolute', top: 0, left: 0, width, height }} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)', '#000000']} locations={[0, 0.55, 0.82, 1]} style={{ position: 'absolute', top: 0, left: 0, width, height }} />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-center px-5">
            <Animated.View entering={FadeInUp.delay(100).springify()} style={{ backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24 }}>
              <Animated.Text entering={FadeInLeft.delay(150).springify()} className="text-2xl font-bold text-white mb-1 text-center">Your ideal travel group?</Animated.Text>
              <Animated.Text entering={FadeInLeft.delay(220).springify()} className="text-sm text-emerald-400 mb-6 text-center">
                What feels right for you?
              </Animated.Text>

              {groupTypes.map((type, index) => (
                <Animated.View key={type.id} entering={FadeInUp.delay(320 + index * 120).springify()}>
                  <Pressable
                    onPress={async () => {
                      await playHeavy();
                      setData({ ...data, groupType: type.id as 'close-knit' | 'open' });
                    }}
                    className={`mb-3 py-5 px-5 rounded-2xl border flex-row items-center ${
                      data.groupType === type.id
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-white/8 border-white/12'
                    } active:opacity-80`}
                  >
                    <Text className="text-2xl mr-4">{type.emoji}</Text>
                    <View className="flex-1">
                      <Text className="text-white text-base font-semibold">{type.label}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">{type.desc}</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(650).springify()} className="px-5 pb-6 pt-3">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-4 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/10'}`}
              >
                <Text className={`text-base font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-500'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 17: Planning Style
  if (currentSlide === 17) {
    const planningStyles = [
      { id: 'planner', label: 'Planner', emoji: '📋' },
      { id: 'spontaneous', label: 'Spontaneous', emoji: '🎲' },
      { id: 'flexible', label: 'Flexible', emoji: '🌊' },
    ];

    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p17.jpeg') }} style={{ position: 'absolute', top: 0, left: 0, width, height }} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)', '#000000']} locations={[0, 0.55, 0.82, 1]} style={{ position: 'absolute', top: 0, left: 0, width, height }} />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-center px-5">
            <Animated.View entering={FadeInUp.delay(100).springify()} style={{ backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24 }}>
              <Animated.Text entering={FadeInLeft.delay(150).springify()} className="text-2xl font-bold text-white mb-1 text-center">Planning vs Spontaneous?</Animated.Text>
              <Animated.Text entering={FadeInLeft.delay(220).springify()} className="text-sm text-emerald-400 mb-6 text-center">
                How do you approach travel?
              </Animated.Text>

              {planningStyles.map((style, index) => (
                <Animated.View key={style.id} entering={FadeInUp.delay(320 + index * 100).springify()}>
                  <Pressable
                    onPress={async () => {
                      await playHeavy();
                      setData({ ...data, planningStyle: style.id as 'planner' | 'spontaneous' | 'flexible' });
                    }}
                    className={`mb-3 py-4 px-5 rounded-2xl border flex-row items-center ${
                      data.planningStyle === style.id
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-white/8 border-white/12'
                    } active:opacity-80`}
                  >
                    <Text className="text-2xl mr-4">{style.emoji}</Text>
                    <Text className="text-white text-base font-semibold flex-1">{style.label}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(650).springify()} className="px-5 pb-6 pt-3">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-4 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/10'}`}
              >
                <Text className={`text-base font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-500'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 18: Travel Experience
  if (currentSlide === 18) {
    const experienceLevels = [
      { id: 'beginner', label: '🌱 Beginner', desc: 'Just starting my travel journey' },
      { id: 'intermediate', label: '🎒 Intermediate', desc: 'Been to a few places, eager for more' },
      { id: 'experienced', label: '🗺️ Experienced', desc: 'Traveled extensively, confident explorer' },
      { id: 'expert', label: '🏆 Expert', desc: 'Seasoned traveler, can guide others' },
    ];

    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p18.jpeg') }} style={{ position: 'absolute', top: 0, left: 0, width, height }} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.7)', '#000000']} locations={[0, 0.55, 0.82, 1]} style={{ position: 'absolute', top: 0, left: 0, width, height }} />

        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-center px-5">
            <Animated.View entering={FadeInUp.delay(100).springify()} style={{ backgroundColor: 'rgba(10,10,10,0.72)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24 }}>
              <Animated.Text entering={FadeInLeft.delay(150).springify()} className="text-2xl font-bold text-white mb-1 text-center">What's your travel experience?</Animated.Text>
              <Animated.Text entering={FadeInLeft.delay(220).springify()} className="text-sm text-emerald-400 mb-5 text-center">
                Where are you on your journey?
              </Animated.Text>

              {experienceLevels.map((level, index) => (
                <Animated.View key={level.id} entering={FadeInUp.delay(320 + index * 80).springify()}>
                  <Pressable
                    onPress={async () => {
                      await playHeavy();
                      setData({ ...data, experience: level.id as 'beginner' | 'intermediate' | 'experienced' | 'expert' });
                    }}
                    className={`mb-2.5 py-3.5 px-5 rounded-2xl border ${
                      data.experience === level.id
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-white/8 border-white/12'
                    } active:opacity-80`}
                  >
                    <Text className="text-white text-base font-semibold">{level.label}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{level.desc}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          </View>

          <Animated.View entering={FadeInUp.delay(750).springify()} className="px-5 pb-6 pt-3">
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue()}
                className={`py-4 rounded-2xl ${canContinue() ? 'bg-emerald-500 active:opacity-80' : 'bg-white/10'}`}
              >
                <Text className={`text-base font-semibold text-center ${canContinue() ? 'text-white' : 'text-gray-500'}`}>
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 19: Calculating Matches
  if (currentSlide === 19) {
    return (
      <View className="flex-1 bg-black">
        <PremiumBackground />
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1 justify-center items-center px-6">
            {!calculationDone ? (
              <>
                <Animated.View entering={ZoomIn.springify()} className="mb-8">
                  <View className="bg-emerald-500/10 p-8 rounded-full">
                    <Animated.View style={animatedStyle}>
                      <Globe size={80} color="#10b981" strokeWidth={1.5} />
                    </Animated.View>
                  </View>
                </Animated.View>

                <Animated.Text entering={FadeInUp.delay(200).springify()} className="text-3xl font-bold text-white text-center mb-4">
                  Finding Your Matches
                </Animated.Text>

                <Animated.Text entering={FadeInUp.delay(400).springify()} className="text-lg text-gray-400 text-center mb-8">
                  Analyzing your travel preferences...
                </Animated.Text>

                <Animated.View entering={FadeIn.delay(600)} className="w-full px-4">
                  <View className="bg-white/10 h-3 rounded-full overflow-hidden">
                    <Animated.View
                      className="bg-emerald-500 h-full rounded-full"
                      style={calculationProgressStyle}
                    />
                  </View>
                </Animated.View>

                <Animated.Text entering={FadeIn.delay(800)} className="text-gray-500 text-sm mt-4">
                  This may take a moment...
                </Animated.Text>
              </>
            ) : (
              <>
                {/* Overlapping Profile Images - Bigger Size */}
                <Animated.View
                  entering={BounceIn}
                  className="flex-row mb-6"
                  style={{ height: 100 }}
                >
                  <Animated.View
                    entering={FadeIn.delay(200).springify()}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      borderWidth: 4,
                      borderColor: '#10b981',
                      overflow: 'hidden',
                      zIndex: 3,
                    }}
                  >
                    <Image
                      source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%204.jpg') }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </Animated.View>
                  <Animated.View
                    entering={FadeIn.delay(300).springify()}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      borderWidth: 4,
                      borderColor: '#10b981',
                      overflow: 'hidden',
                      marginLeft: -25,
                      zIndex: 2,
                    }}
                  >
                    <Image
                      source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%205.jpg') }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </Animated.View>
                  <Animated.View
                    entering={FadeIn.delay(400).springify()}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      borderWidth: 4,
                      borderColor: '#10b981',
                      overflow: 'hidden',
                      marginLeft: -25,
                      zIndex: 1,
                    }}
                  >
                    <Image
                      source={{ uri: getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/onboarding/Image%20OB%206.jpg') }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </Animated.View>
                </Animated.View>

                <Animated.Text entering={FadeInUp.delay(500).springify()} className="text-5xl font-bold text-emerald-400 mb-2">
                  {matchCount.toLocaleString()}
                </Animated.Text>

                <Animated.Text entering={FadeInUp.delay(400).springify()} className="text-2xl font-semibold text-white mb-4">
                  Travelers Match With You!
                </Animated.Text>

                <Animated.Text entering={FadeInUp.delay(600).springify()} className="text-base text-gray-400 text-center mb-12 px-4">
                  Based on your preferences, travel style, and destinations
                </Animated.Text>

                <Animated.View entering={FadeInUp.delay(800).springify()} className="w-full px-4">
                  <Pressable
                    onPress={async () => {
                      await playHeavy();
                      handleContinue();
                    }}
                    className="bg-emerald-500 py-5 rounded-2xl active:opacity-80"
                  >
                    <Text className="text-white text-lg font-semibold text-center">
                      Continue
                    </Text>
                  </Pressable>
                </Animated.View>
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 20: Complete Your Profile (transition slide)
  if (currentSlide === 20) {
    const p3Url = getCachedImageUrl('https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P3.jpeg');

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Full-screen background: P3.jpeg */}
        <Image
          source={{ uri: p3Url }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
          resizeMode="cover"
        />

        {/* Dark gradient overlay — heavier at bottom for text legibility */}
        <LinearGradient
          colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.82)', 'rgba(0,0,0,0.97)']}
          locations={[0, 0.35, 0.7, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28, paddingBottom: 44 }}>
            {/* "Almost there" label */}
            <Animated.View entering={FadeInUp.delay(100).duration(700).springify()}>
              <Text style={{
                fontSize: 12,
                fontWeight: '800',
                letterSpacing: 3.5,
                color: '#10b981',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                Almost there
              </Text>
            </Animated.View>

            {/* Headline */}
            <Animated.View entering={FadeInUp.delay(250).duration(700).springify()}>
              <Text style={{
                fontSize: 36,
                fontWeight: '800',
                color: '#fff',
                lineHeight: 44,
                marginBottom: 16,
                letterSpacing: -0.8,
              }}>
                Before you start finding trips and your matches...
              </Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View entering={FadeInUp.delay(420).duration(700).springify()}>
              <Text style={{
                fontSize: 19,
                fontWeight: '500',
                color: 'rgba(255,255,255,0.72)',
                lineHeight: 27,
                marginBottom: 48,
              }}>
                Let's complete your profile!
              </Text>
            </Animated.View>

            {/* CTA button — large, bold, glowing */}
            <Animated.View entering={FadeInUp.delay(600).duration(600).springify()}>
              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => ({
                  backgroundColor: '#10b981',
                  paddingVertical: 20,
                  borderRadius: 20,
                  alignItems: 'center',
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: pressed ? 0.3 : 0.65,
                  shadowRadius: 28,
                  elevation: 14,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Text style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: '#fff',
                  letterSpacing: 0.4,
                }}>
                  Add Your Photos →
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Slide 21: Profile Photo (last onboarding slide)
  if (currentSlide === 21) {
    const pickImageFromLibrary = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to add profile pictures.',
          [{ text: 'OK' }]
        );
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
      setShowPhotoOptions(false);
    };

    const takePhoto = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your camera to take a profile picture.',
          [{ text: 'OK' }]
        );
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
      setShowPhotoOptions(false);
    };

    const removePhoto = () => {
      setProfilePhotos([]);
      playSoft();
    };

    const handleAddPhoto = () => {
      setShowPhotoOptions(true);
    };

    const primaryPhoto = profilePhotos[0] ?? null;

    return (
      <View className="flex-1 bg-black">
        <PremiumBackground />
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
          <View className="flex-1">
            {/* Header */}
            <View className="px-6 pt-6 pb-4">
              <Animated.Text entering={FadeInDown.delay(100).springify()} className="text-4xl font-bold text-white mb-2">
                Your Profile Photo
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(200).springify()} className="text-base text-gray-400">
                This is what other travelers will see first
              </Animated.Text>
            </View>

            {/* Single hero photo */}
            <Animated.View entering={FadeInUp.delay(300).springify()} className="flex-1 px-6 items-center justify-center">
              <View style={{ width: width * 0.68, aspectRatio: 3 / 4, position: 'relative' }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 28,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: primaryPhoto ? '#10b981' : 'rgba(255,255,255,0.15)',
                    borderStyle: primaryPhoto ? 'solid' : 'dashed',
                  }}
                >
                  {primaryPhoto ? (
                    <View className="flex-1">
                      <Image
                        source={{ uri: primaryPhoto }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      {/* Subtle gradient overlay at bottom */}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.55)']}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90 }}
                      />
                      <View className="absolute bottom-4 left-4">
                        <View className="bg-emerald-500/90 self-start px-3 py-1 rounded-lg">
                          <Text className="text-white text-sm font-bold">Profile Photo</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleAddPhoto}
                      className="flex-1 items-center justify-center bg-white/5"
                    >
                      <View className="bg-white/10 p-6 rounded-full mb-4">
                        <CameraIcon size={36} color="#6b7280" strokeWidth={1.5} />
                      </View>
                      <Text className="text-white font-semibold text-base mb-1">Add Profile Photo</Text>
                      <Text className="text-gray-500 text-sm text-center px-4">Tap to choose your best photo</Text>
                    </Pressable>
                  )}
                </View>

                {/* X delete button — only visible when photo is set */}
                {primaryPhoto && (
                  <Pressable
                    onPress={removePhoto}
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: -12,
                      backgroundColor: '#1a1a1a',
                      borderRadius: 999,
                      padding: 8,
                      borderWidth: 2,
                      borderColor: '#ef4444',
                      zIndex: 10,
                    }}
                    hitSlop={8}
                  >
                    <X size={16} color="#ef4444" strokeWidth={2.5} />
                  </Pressable>
                )}
              </View>

              {/* Status + change photo row */}
              <Animated.View entering={FadeIn.delay(500)} className="mt-6 items-center">
                <View className={`flex-row items-center px-5 py-3 rounded-2xl mb-4 ${primaryPhoto ? 'bg-emerald-500/20' : 'bg-amber-500/15'}`}>
                  {primaryPhoto ? (
                    <Check size={18} color="#10b981" strokeWidth={2.5} />
                  ) : (
                    <CameraIcon size={18} color="#f59e0b" strokeWidth={2} />
                  )}
                  <Text className={`ml-2 font-semibold text-sm ${primaryPhoto ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {primaryPhoto ? 'Looking great!' : '1 photo required to continue'}
                  </Text>
                </View>

                {/* Change/Add photo button */}
                <Pressable
                  onPress={handleAddPhoto}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: primaryPhoto ? 'rgba(255,255,255,0.08)' : '#10b981',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 16,
                    gap: 8,
                  }}
                >
                  <CameraIcon size={18} color={primaryPhoto ? '#9ca3af' : '#fff'} strokeWidth={2} />
                  <Text style={{ color: primaryPhoto ? '#9ca3af' : '#fff', fontWeight: '600', fontSize: 15 }}>
                    {primaryPhoto ? 'Change Photo' : 'Choose Photo'}
                  </Text>
                </Pressable>
              </Animated.View>
            </Animated.View>

            {/* Continue button */}
            <Animated.View entering={FadeInUp.delay(600).springify()} className="px-6 pb-6">
              <Pressable
                onPress={async () => {
                  await playSuccess();
                  handleContinue();
                }}
                disabled={!primaryPhoto}
                className={`py-5 rounded-2xl ${primaryPhoto ? 'bg-emerald-500 active:opacity-80' : 'bg-white/5'}`}
              >
                <Text className={`text-lg font-semibold text-center ${primaryPhoto ? 'text-white' : 'text-gray-600'}`}>
                  {primaryPhoto ? 'Start Exploring →' : 'Continue'}
                </Text>
              </Pressable>
            </Animated.View>
          </View>

          {/* Photo options modal */}
          {showPhotoOptions && (
            <Pressable
              className="absolute inset-0 bg-black/70 justify-end"
              onPress={() => setShowPhotoOptions(false)}
            >
              <Animated.View entering={FadeInUp.springify()} className="bg-neutral-900 rounded-t-3xl p-6 pb-10">
                <View className="w-12 h-1 bg-white/20 rounded-full self-center mb-6" />

                <Text className="text-white text-xl font-bold mb-6 text-center">
                  {primaryPhoto ? 'Change Photo' : 'Add Profile Photo'}
                </Text>

                <Pressable
                  onPress={takePhoto}
                  className="flex-row items-center bg-white/10 p-4 rounded-2xl mb-3 active:opacity-70"
                >
                  <View className="bg-emerald-500/20 p-3 rounded-full mr-4">
                    <CameraIcon size={24} color="#10b981" strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-base">Take Photo</Text>
                    <Text className="text-gray-400 text-sm">Use your camera</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={pickImageFromLibrary}
                  className="flex-row items-center bg-white/10 p-4 rounded-2xl mb-6 active:opacity-70"
                >
                  <View className="bg-emerald-500/20 p-3 rounded-full mr-4">
                    <ImageIcon size={24} color="#10b981" strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-base">Choose from Library</Text>
                    <Text className="text-gray-400 text-sm">Select from your photos</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setShowPhotoOptions(false)}
                  className="py-4 rounded-2xl border border-white/20 active:opacity-70"
                >
                  <Text className="text-white font-semibold text-center">Cancel</Text>
                </Pressable>
              </Animated.View>
            </Pressable>
          )}
        </SafeAreaView>
      </View>
    );
  }

  return null;
}