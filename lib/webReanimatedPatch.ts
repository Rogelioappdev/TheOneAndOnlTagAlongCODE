import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  try {
    const Reanimated = require('react-native-reanimated');
    const React = require('react');

    const AnimatedObj = Reanimated.default ?? Reanimated;

    const makeWebSafe = (OriginalComponent: any, name: string) => {
      if (!OriginalComponent) return OriginalComponent;
      const Patched = React.forwardRef(
        ({ entering: _e, exiting: _x, layout: _l, ...props }: any, ref: any) =>
          React.createElement(OriginalComponent, { ...props, ref })
      );
      Patched.displayName = name;
      return Patched;
    };

    if (AnimatedObj) {
      AnimatedObj.View = makeWebSafe(AnimatedObj.View, 'Animated.View');
      AnimatedObj.Text = makeWebSafe(AnimatedObj.Text, 'Animated.Text');
      AnimatedObj.Image = makeWebSafe(AnimatedObj.Image, 'Animated.Image');
      AnimatedObj.ScrollView = makeWebSafe(AnimatedObj.ScrollView, 'Animated.ScrollView');
      AnimatedObj.FlatList = makeWebSafe(AnimatedObj.FlatList, 'Animated.FlatList');
    }

    console.log('[WebPatch] Reanimated layout animations patched for web');
  } catch (e) {
    console.warn('[WebPatch] Failed to patch reanimated:', e);
  }
}
