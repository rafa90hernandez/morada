import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, radius, spacing } from "@/theme/tokens";
import {
  formatBrazilianCurrencyInput,
  formatBrazilianDateInput,
} from "./input-formatters";

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Field({ label, value, onChangeText, numeric = false, multiline = false }: {
  label: string; value: string; onChangeText: (value: string) => void; numeric?: boolean; multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} keyboardType={numeric ? "number-pad" : "default"} multiline={multiline}
        onChangeText={onChangeText} placeholder={label} placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && styles.multiline]} value={value} />
    </View>
  );
}

export function DateField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} keyboardType="number-pad" maxLength={10}
        onChangeText={(next) => onChangeText(formatBrazilianDateInput(next))} placeholder="DD/MM/AAAA"
        placeholderTextColor={colors.textMuted} style={styles.input} value={value} />
    </View>
  );
}

export function CurrencyField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.currencyRow}>
        <Text style={styles.currencyPrefix}>€</Text>
        <TextInput accessibilityLabel={label} keyboardType="number-pad"
          onChangeText={(next) => onChangeText(formatBrazilianCurrencyInput(next))} placeholder="0,00"
          placeholderTextColor={colors.textMuted} style={[styles.input, styles.currencyInput]} value={value} />
      </View>
    </View>
  );
}

export function NumericStepper({ label, value, onChangeText, min = 0, max = 100 }: {
  label: string; value: string; onChangeText: (value: string) => void; min?: number; max?: number;
}) {
  const parsed = Number.parseInt(value, 10);
  const current = Number.isFinite(parsed) ? parsed : min;
  const setBounded = (next: number) => onChangeText(String(Math.min(max, Math.max(min, next))));
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable accessibilityLabel={`Diminuir ${label}`} accessibilityRole="button" disabled={current <= min}
          onPress={() => setBounded(current - 1)} style={styles.stepperButton}><Text style={styles.stepperText}>−</Text></Pressable>
        <TextInput accessibilityLabel={label} keyboardType="number-pad" onBlur={() => value && setBounded(current)}
          onChangeText={(next) => onChangeText(next.replace(/\D/g, ""))} style={[styles.input, styles.stepperInput]} value={value} />
        <Pressable accessibilityLabel={`Aumentar ${label}`} accessibilityRole="button" disabled={current >= max}
          onPress={() => setBounded(current + 1)} style={styles.stepperButton}><Text style={styles.stepperText}>+</Text></Pressable>
      </View>
    </View>
  );
}

export function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} /></View>;
}

export function ChoiceGroup<T extends string>({ label, options, value, onChange, clearable = true }: {
  label: string; options: Array<{ value: T; label: string }>; value: T | undefined; onChange: (value: T | undefined) => void; clearable?: boolean;
}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.choiceWrap}>{options.map((option) => {
    const selected = value === option.value;
    return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={option.value}
      onPress={() => onChange(clearable && selected ? undefined : option.value)} style={[styles.choice, selected && styles.choiceSelected]}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text></Pressable>;
  })}</View></View>;
}

export function MultiChoice<T extends string>({ label, options, values, onChange }: {
  label: string; options: Array<{ value: T; label: string }>; values: T[]; onChange: (values: T[]) => void;
}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.choiceWrap}>{options.map((option) => {
    const selected = values.includes(option.value);
    return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} key={option.value}
      onPress={() => onChange(selected ? values.filter((value) => value !== option.value) : [...values, option.value])}
      style={[styles.choice, selected && styles.choiceSelected]}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text></Pressable>;
  })}</View></View>;
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: spacing.sm },
  field: { gap: spacing.xs }, label: { color: colors.text, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, fontSize: 16 },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: "top" },
  toggleRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  toggleLabel: { flex: 1, color: colors.text, fontWeight: "600" },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: { minHeight: 42, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceText: { color: colors.text, fontWeight: "700" }, choiceTextSelected: { color: colors.primary },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepperButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  stepperText: { color: colors.primary, fontSize: 24, fontWeight: "800" }, stepperInput: { flex: 1, textAlign: "center" },
  currencyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, currencyPrefix: { color: colors.text, fontSize: 18, fontWeight: "800" }, currencyInput: { flex: 1 },
});
