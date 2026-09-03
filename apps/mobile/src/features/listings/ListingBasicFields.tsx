import {
  ChoiceGroup,
  Field,
  NumericStepper,
  SectionTitle,
  SuggestionField,
} from "./ListingFormControls";
import type { ListingDraft } from "./listing-draft";
import { bedTypes, roomTypes } from "./listing-field-types";
import { irelandCitySuggestions } from "./location-suggestions";

const propertyTypes = [
  { value: "SINGLE_ROOM", label: "Quarto individual" },
  { value: "SHARED_ROOM", label: "Quarto compartilhado" },
  { value: "STUDIO", label: "Studio" },
  { value: "APARTMENT", label: "Apartamento" },
  { value: "HOUSE", label: "Casa" },
  { value: "BED_SPACE", label: "Vaga em quarto" },
  { value: "OTHER", label: "Outro" },
] as const;

const occupancy = [
  { value: "ENTIRE_PROPERTY", label: "Imóvel inteiro" },
  { value: "SHARED_PROPERTY", label: "Imóvel compartilhado" },
] as const;

const space = [
  { value: "PRIVATE", label: "Privado" },
  { value: "SHARED", label: "Compartilhado" },
] as const;

const bathrooms = [
  { value: "PRIVATE", label: "Banheiro privado" },
  { value: "SHARED", label: "Banheiro compartilhado" },
] as const;

type Props = {
  draft: ListingDraft;
  set: <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => void;
};

export function ListingBasicFields({ draft, set }: Props) {
  return (
    <>
      <SectionTitle>Informações principais</SectionTitle>
      <Field
        label="Título"
        value={draft.title}
        onChangeText={(value) => set("title", value)}
      />
      <Field
        label="Descrição"
        multiline
        value={draft.description}
        onChangeText={(value) => set("description", value)}
      />
      <SuggestionField
        label="Cidade"
        value={draft.city}
        onChangeText={(value) => set("city", value)}
        suggestions={irelandCitySuggestions}
      />
      <Field
        label="Área / bairro"
        value={draft.area}
        onChangeText={(value) => set("area", value)}
      />
      <ChoiceGroup
        clearable={false}
        label="Tipo de imóvel"
        onChange={(value) => value && set("propertyType", value)}
        options={[...propertyTypes]}
        value={draft.propertyType}
      />
      <ChoiceGroup
        label="O imóvel é"
        onChange={(value) => set("propertyOccupancyType", value)}
        options={[...occupancy]}
        value={draft.propertyOccupancyType}
      />
      <ChoiceGroup
        label="Espaço anunciado"
        onChange={(value) => set("advertisedSpaceType", value)}
        options={[...space]}
        value={draft.advertisedSpaceType}
      />
      <NumericStepper
        label="Número de quartos"
        min={0}
        max={50}
        value={draft.bedroomCount}
        onChangeText={(value) => set("bedroomCount", value)}
      />
      <NumericStepper
        label="Número de banheiros"
        min={0}
        max={50}
        value={draft.bathroomCount}
        onChangeText={(value) => set("bathroomCount", value)}
      />
      <ChoiceGroup
        label="Tipo de quarto"
        onChange={(value) => set("roomType", value)}
        options={roomTypes}
        value={draft.roomType}
      />
      <ChoiceGroup
        label="Tipo de cama"
        onChange={(value) => set("bedType", value)}
        options={bedTypes}
        value={draft.bedType}
      />
      <NumericStepper
        label="Capacidade máxima"
        min={1}
        max={100}
        value={draft.maxOccupants}
        onChangeText={(value) => set("maxOccupants", value)}
      />
      <NumericStepper
        label="Pessoas compartilhando o espaço"
        min={0}
        max={100}
        value={draft.peopleSharingSpace}
        onChangeText={(value) => set("peopleSharingSpace", value)}
      />
      <ChoiceGroup
        label="Banheiro"
        onChange={(value) => set("bathroomType", value)}
        options={[...bathrooms]}
        value={draft.bathroomType}
      />
      <NumericStepper
        label="Pessoas compartilhando o banheiro"
        min={0}
        max={100}
        value={draft.peopleSharingBathroom}
        onChangeText={(value) => set("peopleSharingBathroom", value)}
      />
    </>
  );
}
