// This screen has moved into MyTripsModal inside the TagAlong tab (index.tsx).
// The file must exist so Expo Router doesn't throw a missing-route error,
// but it renders nothing — the tab is hidden via href: null in _layout.tsx.
export default function MyTripsPage() {
  return null;
}