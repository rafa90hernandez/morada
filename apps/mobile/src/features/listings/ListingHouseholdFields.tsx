import {
  ChoiceGroup,
  Field,
  NumericStepper,
  SectionTitle,
  Toggle,
} from "./ListingFormControls";
import type { ListingDraft } from "./listing-draft";

const genders = [
  { value: "ALL_WOMEN", label: "Só mulheres" },
  { value: "ALL_MEN", label: "Só homens" },
  { value: "MIXED", label: "Misto" },
  { value: "OTHER", label: "Outro" },
  { value: "NOT_STATED", label: "Não informar" },
] as const;

type HouseholdSection = "household" | "rules" | "all";

type Props = {
  draft: ListingDraft;
  section?: HouseholdSection;
  set: <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => void;
};

export function ListingHouseholdFields({ draft, section = "all", set }: Props) {
  const showHousehold = section === "all" || section === "household";
  const showRules = section === "all" || section === "rules";

  return (
    <>
      {showHousehold ? (
        <>
          <SectionTitle>Quem já mora na casa?</SectionTitle>
          <NumericStepper
            label="Total de moradores atuais"
            min={0}
            max={100}
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
            label="Senhorio mora no imóvel"
            value={draft.landlordLivesHere}
            onValueChange={(value) => set("landlordLivesHere", value)}
          />
        </>
      ) : null}

      {showRules ? (
        <>
          <SectionTitle>Regras e convivência</SectionTitle>
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
      ) : null}
    </>
  );
}
