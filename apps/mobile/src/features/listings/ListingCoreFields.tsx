import { ChoiceGroup, Field, SectionTitle, Toggle } from "./ListingFormControls";
import type { ListingDraft } from "./listing-draft";
import { bedTypes, roomTypes } from "./listing-field-types";

const propertyTypes = [
  { value: "SINGLE_ROOM", label: "Quarto individual" }, { value: "SHARED_ROOM", label: "Quarto compartilhado" },
  { value: "STUDIO", label: "Studio" }, { value: "APARTMENT", label: "Apartamento" },
  { value: "HOUSE", label: "Casa" }, { value: "BED_SPACE", label: "Vaga em quarto" }, { value: "OTHER", label: "Outro" },
] as const;
const occupancy = [{ value: "ENTIRE_PROPERTY", label: "Imóvel inteiro" }, { value: "SHARED_PROPERTY", label: "Imóvel compartilhado" }] as const;
const space = [{ value: "PRIVATE", label: "Privado" }, { value: "SHARED", label: "Compartilhado" }] as const;
const bathrooms = [{ value: "PRIVATE", label: "Banheiro privado" }, { value: "SHARED", label: "Banheiro compartilhado" }] as const;
const genders = [{ value: "ALL_WOMEN", label: "Só mulheres" }, { value: "ALL_MEN", label: "Só homens" }, { value: "MIXED", label: "Misto" }, { value: "OTHER", label: "Outro" }, { value: "NOT_STATED", label: "Não informar" }] as const;
const bills = [{ value: "YES", label: "Incluídas" }, { value: "NO", label: "Não incluídas" }, { value: "PARTIAL", label: "Parcialmente" }] as const;

type Props = { draft: ListingDraft; set: <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => void };
export function ListingCoreFields({ draft, set }: Props) {
  return <>
    <SectionTitle>Informações principais</SectionTitle>
    <Field label="Título" value={draft.title} onChangeText={(v) => set("title", v)} />
    <Field label="Descrição" value={draft.description} multiline onChangeText={(v) => set("description", v)} />
    <Field label="Cidade" value={draft.city} onChangeText={(v) => set("city", v)} />
    <Field label="Área / bairro" value={draft.area} onChangeText={(v) => set("area", v)} />
    <ChoiceGroup label="Tipo de imóvel" options={[...propertyTypes]} value={draft.propertyType} clearable={false} onChange={(v) => v && set("propertyType", v)} />
    <ChoiceGroup label="O imóvel é" options={[...occupancy]} value={draft.propertyOccupancyType} onChange={(v) => set("propertyOccupancyType", v)} />
    <ChoiceGroup label="Espaço anunciado" options={[...space]} value={draft.advertisedSpaceType} onChange={(v) => set("advertisedSpaceType", v)} />
    <Field label="Número de quartos" numeric value={draft.bedroomCount} onChangeText={(v) => set("bedroomCount", v)} />
    <Field label="Número de banheiros" numeric value={draft.bathroomCount} onChangeText={(v) => set("bathroomCount", v)} />
    <ChoiceGroup label="Tipo de quarto" options={roomTypes} value={draft.roomType} onChange={(v) => set("roomType", v)} />
    <ChoiceGroup label="Tipo de cama" options={bedTypes} value={draft.bedType} onChange={(v) => set("bedType", v)} />
    <Field label="Capacidade máxima" numeric value={draft.maxOccupants} onChangeText={(v) => set("maxOccupants", v)} />
    <Field label="Pessoas compartilhando o espaço" numeric value={draft.peopleSharingSpace} onChangeText={(v) => set("peopleSharingSpace", v)} />
    <ChoiceGroup label="Banheiro" options={[...bathrooms]} value={draft.bathroomType} onChange={(v) => set("bathroomType", v)} />
    <Field label="Pessoas compartilhando o banheiro" numeric value={draft.peopleSharingBathroom} onChangeText={(v) => set("peopleSharingBathroom", v)} />
    <SectionTitle>Moradores e regras</SectionTitle>
    <Field label="Total de moradores atuais" numeric value={draft.currentResidentCount} onChangeText={(v) => set("currentResidentCount", v)} />
    <ChoiceGroup label="Composição atual da casa" options={[...genders]} value={draft.householdGenderComposition} onChange={(v) => set("householdGenderComposition", v)} />
    <Toggle label="Casais aceitos" value={draft.couplesAllowed} onValueChange={(v) => set("couplesAllowed", v)} />
    <Toggle label="Pets aceitos" value={draft.petsAllowed} onValueChange={(v) => set("petsAllowed", v)} />
    <Toggle label="Famílias / crianças aceitas" value={draft.childrenFamiliesAllowed} onValueChange={(v) => set("childrenFamiliesAllowed", v)} />
    <Toggle label="Estudantes aceitos" value={draft.studentsAllowed} onValueChange={(v) => set("studentsAllowed", v)} />
    <Toggle label="Fumar permitido" value={draft.smokingAllowed} onValueChange={(v) => set("smokingAllowed", v)} />
    <Toggle label="Senhorio mora no imóvel" value={draft.landlordLivesHere} onValueChange={(v) => set("landlordLivesHere", v)} />
    <Toggle label="Festas permitidas" value={draft.partiesAllowed} onValueChange={(v) => set("partiesAllowed", v)} />
    <Toggle label="Visitantes permitidos" value={draft.visitorsAllowed} onValueChange={(v) => set("visitorsAllowed", v)} />
    <Field label="Horário de silêncio" value={draft.quietHoursNote} onChangeText={(v) => set("quietHoursNote", v)} />
    <Field label="Regras da casa" multiline value={draft.houseRules} onChangeText={(v) => set("houseRules", v)} />
    <SectionTitle>Preço e disponibilidade</SectionTitle>
    <Field label="Aluguel mensal (€)" numeric value={draft.monthlyPrice} onChangeText={(v) => set("monthlyPrice", v)} />
    <Field label="Depósito (€)" numeric value={draft.deposit} onChangeText={(v) => set("deposit", v)} />
    <ChoiceGroup label="Contas" options={[...bills]} value={draft.billsIncludedType} onChange={(v) => set("billsIncludedType", v)} />
    <Field label="Contas mensais estimadas (€)" numeric value={draft.estimatedMonthlyBills} onChangeText={(v) => set("estimatedMonthlyBills", v)} />
    <Field label="Aluguel antecipado (€)" numeric value={draft.firstRentAdvance} onChangeText={(v) => set("firstRentAdvance", v)} />
    <Field label="Outros custos" value={draft.extraCostsNote} onChangeText={(v) => set("extraCostsNote", v)} />
    <Field label="Disponível a partir de (AAAA-MM-DD)" value={draft.availableFrom} onChangeText={(v) => set("availableFrom", v)} />
    <Field label="Disponível até (AAAA-MM-DD)" value={draft.availableUntil} onChangeText={(v) => set("availableUntil", v)} />
    <Field label="Estadia mínima (dias)" numeric value={draft.minimumStayDays} onChangeText={(v) => set("minimumStayDays", v)} />
  </>;
}