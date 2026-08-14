import { ListingBasicFields } from "./ListingBasicFields";
import { ChoiceGroup, Field, SectionTitle } from "./ListingFormControls";
import { ListingHouseholdFields } from "./ListingHouseholdFields";
import type { ListingDraft } from "./listing-draft";

const bills = [
  { value: "YES", label: "Incluídas" },
  { value: "NO", label: "Não incluídas" },
  { value: "PARTIAL", label: "Parcialmente" },
] as const;

type Props = {
  draft: ListingDraft;
  set: <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => void;
};

export function ListingCoreFields({ draft, set }: Props) {
  return (
    <>
      <ListingBasicFields draft={draft} set={set} />
      <ListingHouseholdFields draft={draft} set={set} />
      <SectionTitle>Preço e disponibilidade</SectionTitle>
      <Field
        label="Aluguel mensal (€)"
        numeric
        value={draft.monthlyPrice}
        onChangeText={(value) => set("monthlyPrice", value)}
      />
      <Field
        label="Depósito (€)"
        numeric
        value={draft.deposit}
        onChangeText={(value) => set("deposit", value)}
      />
      <ChoiceGroup
        label="Contas"
        options={[...bills]}
        value={draft.billsIncludedType}
        onChange={(value) => set("billsIncludedType", value)}
      />
      <Field
        label="Contas mensais estimadas (€)"
        numeric
        value={draft.estimatedMonthlyBills}
        onChangeText={(value) => set("estimatedMonthlyBills", value)}
      />
      <Field
        label="Aluguel antecipado (€)"
        numeric
        value={draft.firstRentAdvance}
        onChangeText={(value) => set("firstRentAdvance", value)}
      />
      <Field
        label="Outros custos"
        value={draft.extraCostsNote}
        onChangeText={(value) => set("extraCostsNote", value)}
      />
      <Field
        label="Disponível a partir de (AAAA-MM-DD)"
        value={draft.availableFrom}
        onChangeText={(value) => set("availableFrom", value)}
      />
      <Field
        label="Disponível até (AAAA-MM-DD)"
        value={draft.availableUntil}
        onChangeText={(value) => set("availableUntil", value)}
      />
      <Field
        label="Estadia mínima (dias)"
        numeric
        value={draft.minimumStayDays}
        onChangeText={(value) => set("minimumStayDays", value)}
      />
    </>
  );
}
