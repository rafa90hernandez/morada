import { ChoiceGroup, Field, SectionTitle, Toggle } from "./ListingFormControls";
import type { ListingDraft } from "./listing-draft";

const genders = [
  { value: "ALL_WOMEN", label: "Só mulheres" },
  { value: "ALL_MEN", label: "Só homens" },
  { value: "MIXED", label: "Misto" },
  { value: "OTHER", label: "Outro" },
  { value: "NOT_STATED", label: "Não informar" },
] as const;

type Props = {
  draft: ListingDraft;
  set: <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => void;
};

export function ListingHouseholdFields({ draft, set }: Props) {
  return (
    <>
      <SectionTitle>Moradores e regras</SectionTitle>
      <Field
        label="Total de moradores atuais"
        numeric
        value={draft.currentResidentCount}
        onChangeText={(value) => set("currentResidentCount", value)}
      />
      <ChoiceGroup
        label="Composição atual da casa"
        options={[...genders]}
        value={draft.householdGenderComposition}
        onChange={(value) => set("householdGenderComposition", value)}
      />
      <Toggle
        label="Casais aceitos"
        value={draft.couplesAllowed}
        onValueChange={(value) => set("couplesAllowed", value)}
      />
      <Toggle
        label="Pets aceitos"
        value={draft.petsAllowed}
        onValueChange={(value) => set("petsAllowed", value)}
      />
      <Toggle
        label="Famílias / crianças aceitas"
        value={draft.childrenFamiliesAllowed}
        onValueChange={(value) => set("childrenFamiliesAllowed", value)}
      />
      <Toggle
        label="Estudantes aceitos"
        value={draft.studentsAllowed}
        onValueChange={(value) => set("studentsAllowed", value)}
      />
      <Toggle
        label="Fumar permitido"
        value={draft.smokingAllowed}
        onValueChange={(value) => set("smokingAllowed", value)}
      />
      <Toggle
        label="Senhorio mora no imóvel"
        value={draft.landlordLivesHere}
        onValueChange={(value) => set("landlordLivesHere", value)}
      />
      <Toggle
        label="Festas permitidas"
        value={draft.partiesAllowed}
        onValueChange={(value) => set("partiesAllowed", value)}
      />
      <Toggle
        label="Visitantes permitidos"
        value={draft.visitorsAllowed}
        onValueChange={(value) => set("visitorsAllowed", value)}
      />
      <Field
        label="Horário de silêncio"
        value={draft.quietHoursNote}
        onChangeText={(value) => set("quietHoursNote", value)}
      />
      <Field
        label="Regras da casa"
        multiline
        value={draft.houseRules}
        onChangeText={(value) => set("houseRules", value)}
      />
    </>
  );
}
