import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import TagAlongTabButton from './TagAlongTabButton';

interface TagAlongCenterTabProps {
  accessibilityState?: {
    selected?: boolean;
  };
  onPress?: () => void;
}

export default function TagAlongCenterTab({ accessibilityState, onPress }: TagAlongCenterTabProps) {
  const router = useRouter();

  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <TagAlongTabButton
        onPress={onPress ?? (() => router.push('/(tabs)'))}
        focused={accessibilityState?.selected ?? false}
      />
    </View>
  );
}