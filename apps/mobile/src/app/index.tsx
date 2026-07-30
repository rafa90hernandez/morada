import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.eyebrow}>
            MORADA
          </Text>
          <Text style={styles.title}>Sua vida na Irlanda, em um só lugar.</Text>
          <Text style={styles.description}>
            A base do aplicativo mobile está pronta para receber os fluxos reais do produto.
          </Text>
        </View>

        <AppButton
          accessibilityHint="Avança para o próximo fluxo quando ele estiver disponível"
          disabled
          label="Em breve"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  content: {
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    maxWidth: 340,
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  description: {
    maxWidth: 340,
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
  },
});
