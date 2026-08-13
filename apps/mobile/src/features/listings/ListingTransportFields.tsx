import { Pressable, StyleSheet, Text, View } from "react-native";
import { Field, SectionTitle } from "./ListingFormControls";
import type { ListingDraft } from "./listing-draft";
import type { TransportDraft, TransportMode } from "./listing-field-types";
import { colors, radius, spacing } from "@/theme/tokens";

const modes: Array<{ value: TransportMode; label: string }> = [{ value: "BUS", label: "Bus" }, { value: "LUAS", label: "LUAS" }, { value: "DART", label: "DART" }, { value: "TRAIN", label: "Train" }];
type Props = { draft: ListingDraft; set: <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => void };
export function ListingTransportFields({ draft, set }: Props) {
  const update = (index: number, patch: Partial<TransportDraft>) => set("transportOptions", draft.transportOptions.map((item, i) => i === index ? { ...item, ...patch } : item));
  const add = (mode: TransportMode) => set("transportOptions", [...draft.transportOptions, { mode, stopName: "", lineName: "", walkingMinutes: "" }]);
  return <>
    <SectionTitle>Transporte próximo</SectionTitle>
    <Field label="Resumo de transporte" multiline value={draft.transportInfo} onChangeText={(v) => set("transportInfo", v)} />
    <View style={styles.row}>{modes.map((mode) => <Pressable key={mode.value} style={styles.add} onPress={() => add(mode.value)}><Text style={styles.addText}>+ {mode.label}</Text></Pressable>)}</View>
    {draft.transportOptions.map((option, index) => <View key={`${option.mode}-${index}`} style={styles.card}>
      <Text style={styles.title}>{option.mode}</Text>
      <Field label="Parada / estação" value={option.stopName} onChangeText={(v) => update(index, { stopName: v })} />
      <Field label="Linha" value={option.lineName} onChangeText={(v) => update(index, { lineName: v })} />
      <Field label="Caminhada aproximada (min)" numeric value={option.walkingMinutes} onChangeText={(v) => update(index, { walkingMinutes: v })} />
      <Pressable onPress={() => set("transportOptions", draft.transportOptions.filter((_, i) => i !== index))}><Text style={styles.remove}>Remover</Text></Pressable>
    </View>)}
  </>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, add: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, addText: { color: colors.primary, fontWeight: "700" }, card: { gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md }, title: { color: colors.text, fontWeight: "800" }, remove: { color: colors.danger, fontWeight: "700" } });