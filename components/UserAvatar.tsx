import { View, Text, Image, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function getAvatarColors(name: string): [string, string] {
  const palette: [string, string][] = [
    ['#0b84ff', '#0066cc'],
    ['#ff375f', '#cc1e3e'],
    ['#ff9f0a', '#cc7d00'],
    ['#30d158', '#1eaa40'],
    ['#bf5af2', '#9a33d0'],
    ['#ff6482', '#e04761'],
    ['#64d2ff', '#3ab8e8'],
    ['#ffd60a', '#ccab00'],
  ];
  const index = ((name?.charCodeAt(0) ?? 65) - 65) % palette.length;
  return palette[Math.abs(index)] ?? ['#636366', '#48484a'];
}

interface Props {
  uri?: string | null;
  name?: string | null;
  size: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function UserAvatar({ uri, name, size, borderRadius, style }: Props) {
  const radius = borderRadius ?? size / 2;
  const initial = (name?.trim().charAt(0) ?? '?').toUpperCase();
  const colors = getAvatarColors(name ?? '?');

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: radius, backgroundColor: '#1a1a1a' }, style as any]}
        resizeMode="cover"
      />
    );
  }

  return (
    <LinearGradient
      colors={colors}
      style={[{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }, style as any]}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700', letterSpacing: 0.5 }}>
        {initial}
      </Text>
    </LinearGradient>
  );
}
