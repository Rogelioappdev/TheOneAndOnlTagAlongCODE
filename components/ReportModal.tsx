import { useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Colors } from '@/lib/theme';

export const REPORT_REASONS = [
  'Spam or scam',
  'Inappropriate content',
  'Harassment or bullying',
  'Fake profile',
  'Hate speech',
  'Other',
];

interface Props {
  visible: boolean;
  targetName: string;
  onSubmit: (reason: string) => void;
  onClose: () => void;
  submitting: boolean;
}

export default function ReportModal({ visible, targetName, onSubmit, onClose, submitting }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        onPress={handleClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={{
            backgroundColor: '#111',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
          }}>
            <View style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: Colors.border,
              alignSelf: 'center', marginBottom: 20,
            }} />
            <Text style={{ color: Colors.text, fontSize: 18, fontFamily: 'Outfit-Bold', letterSpacing: -0.4, marginBottom: 4 }}>
              Report
            </Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 14, fontFamily: 'Outfit-Regular', marginBottom: 20 }}>
              Why are you reporting {targetName}?
            </Text>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => setSelected(reason)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
                  marginBottom: 8,
                  backgroundColor: selected === reason ? Colors.dangerDim : 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: selected === reason ? Colors.danger : Colors.border,
                }}
              >
                <Text style={{
                  color: Colors.text,
                  fontSize: 15,
                  fontFamily: selected === reason ? 'Outfit-SemiBold' : 'Outfit-Regular',
                }}>
                  {reason}
                </Text>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  borderWidth: 2,
                  borderColor: selected === reason ? Colors.danger : Colors.borderStrong,
                  backgroundColor: selected === reason ? Colors.danger : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected === reason && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                  )}
                </View>
              </Pressable>
            ))}
            <Pressable
              onPress={() => { if (selected) onSubmit(selected); }}
              disabled={!selected || submitting}
              style={{
                marginTop: 8, borderRadius: 16, paddingVertical: 16,
                backgroundColor: selected && !submitting ? Colors.danger : 'rgba(255,255,255,0.08)',
                alignItems: 'center',
              }}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: selected ? '#fff' : Colors.textTertiary, fontSize: 16, fontFamily: 'Outfit-Bold' }}>
                    Submit Report
                  </Text>
              }
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
