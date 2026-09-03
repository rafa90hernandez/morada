import { ListingBasicFields } from "./ListingBasicFields";
import {
  ChoiceGroup,
  CurrencyField,
  DateField,
  Field,
  NumericStepper,
  SectionTitle,
} from "./ListingFormControls";
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
      <CurrencyField
        label="Aluguel mensal"
        value={draft.monthlyPrice}
        onChangeText={(value) => set("monthlyPrice", value)}
      />
      <CurrencyField
        label="Depósito"
        value={draft.deposit}
        onChangeText={(value) => set("deposit", value)}
      />
      <ChoiceGroup
        label="Contas"
        options={[...bills]}
        value={draft.billsIncludedType}
        onChange={(value) => set("billsIncludedType", value)}
      />
      <CurrencyField
        label="Contas mensais estimadas"
        value={draft.estimatedMonthlyBills}
        onChangeText={(value) => set("estimatedMonthlyBills", value)}
      />
      <CurrencyField
        label="Aluguel antecipado"
        value={draft.firstRentAdvance}
        onChangeText={(value) => set("firstRentAdvance", value)}
      />
      <Field
        label="Outros custos"
        value={draft.extraCostsNote}
        onChangeText={(value) => set("extraCostsNote", value)}
      />
      <DateField
        label="Disponível a partir de"
        value={draft.availableFrom}
        onChangeText={(value) => set("availableFrom", value)}
      />
      <DateField
        label="Disponível até"
        value={draft.availableUntil}
        onChangeText={(value) => set("availableUntil", value)}
      />
      <NumericStepper
        label="Estadia mínima (dias)"
        min={1}
        max={3650}
        value={draft.minimumStayDays}
        onChangeText={(value) => set("minimumStayDays", value)}
      />
    </>
  );
}
