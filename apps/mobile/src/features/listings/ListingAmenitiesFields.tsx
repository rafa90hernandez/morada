import {
  ChoiceGroup,
  Field,
  MultiChoice,
  SectionTitle,
  Toggle,
} from "./ListingFormControls";
import type { ListingDraft } from "./listing-draft";
import {
  heatingTypes,
  type KitchenAmenity,
  type OutdoorAmenity,
} from "./listing-field-types";

const kitchen: Array<{ value: KitchenAmenity; label: string }> = [
  { value: "FRIDGE", label: "Geladeira" },
  { value: "FREEZER", label: "Freezer" },
  { value: "OVEN", label: "Forno" },
  { value: "HOB", label: "Fogão / hob" },
  { value: "MICROWAVE", label: "Micro-ondas" },
  { value: "DISHWASHER", label: "Lava-louças" },
  { value: "KETTLE", label: "Chaleira" },
];
const outdoor: Array<{ value: OutdoorAmenity; label: string }> = [
  { value: "BALCONY", label: "Varanda" },
  { value: "GARDEN", label: "Jardim" },
  { value: "YARD", label: "Quintal" },
  { value: "TERRACE", label: "Terraço" },
  { value: "SHARED_OUTDOOR_SPACE", label: "Área externa compartilhada" },
];
type Props = {
  draft: ListingDraft;
  set: <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => void;
};
export function ListingAmenitiesFields({ draft, set }: Props) {
  return (
    <>
      <SectionTitle>Requisitos da locação</SectionTitle>
      <Toggle
        label="Contrato formal"
        value={draft.formalContract}
        onValueChange={(v) => set("formalContract", v)}
      />
      <Toggle
        label="Aprovação do senhorio necessária"
        value={draft.landlordApprovalRequired}
        onValueChange={(v) => set("landlordApprovalRequired", v)}
      />
      <Toggle
        label="Comprovante de renda"
        value={draft.proofOfIncomeRequired}
        onValueChange={(v) => set("proofOfIncomeRequired", v)}
      />
      <Toggle
        label="Comprovante de emprego"
        value={draft.proofOfEmploymentRequired}
        onValueChange={(v) => set("proofOfEmploymentRequired", v)}
      />
      <Toggle
        label="Referência anterior"
        value={draft.priorReferenceRequired}
        onValueChange={(v) => set("priorReferenceRequired", v)}
      />
      <Field
        label="Outros requisitos objetivos"
        multiline
        value={draft.otherRequirementsNote}
        onChangeText={(v) => set("otherRequirementsNote", v)}
      />
      <SectionTitle>Imóvel e acessibilidade</SectionTitle>
      <Field
        label="Andar"
        numeric
        value={draft.floorNumber}
        onChangeText={(v) => set("floorNumber", v)}
      />
      <Toggle
        label="Térreo"
        value={draft.isGroundFloor}
        onValueChange={(v) => set("isGroundFloor", v)}
      />
      <Toggle
        label="Elevador"
        value={draft.hasLift}
        onValueChange={(v) => set("hasLift", v)}
      />
      <Toggle
        label="Mobiliado"
        value={draft.furnished}
        onValueChange={(v) => set("furnished", v)}
      />
      <ChoiceGroup
        label="Aquecimento"
        options={heatingTypes}
        value={draft.heatingType}
        onChange={(v) => set("heatingType", v)}
      />
      <Toggle
        label="Acesso sem degraus"
        value={draft.stepFreeAccess}
        onValueChange={(v) => set("stepFreeAccess", v)}
      />
      <Toggle
        label="Entrada acessível"
        value={draft.accessibleEntrance}
        onValueChange={(v) => set("accessibleEntrance", v)}
      />
      <Toggle
        label="Banheiro adaptado"
        value={draft.adaptedBathroom}
        onValueChange={(v) => set("adaptedBathroom", v)}
      />
      <Toggle
        label="Espaço para cadeira de rodas"
        value={draft.wheelchairSpace}
        onValueChange={(v) => set("wheelchairSpace", v)}
      />
      <Toggle
        label="Estacionamento acessível"
        value={draft.accessibleParking}
        onValueChange={(v) => set("accessibleParking", v)}
      />
      <Field
        label="Outras informações de acessibilidade"
        value={draft.accessibilityOtherNote}
        onChangeText={(v) => set("accessibilityOtherNote", v)}
      />
      <SectionTitle>Internet e lavanderia</SectionTitle>
      <Toggle
        label="Internet disponível"
        value={draft.internetAvailable}
        onValueChange={(v) => set("internetAvailable", v)}
      />
      <Toggle
        label="Wi-Fi disponível"
        value={draft.wifiAvailable}
        onValueChange={(v) => set("wifiAvailable", v)}
      />
      <Toggle
        label="Internet incluída nas contas"
        value={draft.internetIncludedInBills}
        onValueChange={(v) => set("internetIncludedInBills", v)}
      />
      <Field
        label="Velocidade da internet (Mbps)"
        numeric
        value={draft.internetSpeedMbps}
        onChangeText={(v) => set("internetSpeedMbps", v)}
      />
      <Field
        label="Provedor de internet"
        value={draft.internetProvider}
        onChangeText={(v) => set("internetProvider", v)}
      />
      <Toggle
        label="Máquina de lavar"
        value={draft.washingMachine}
        onValueChange={(v) => set("washingMachine", v)}
      />
      <Toggle
        label="Secadora"
        value={draft.dryer}
        onValueChange={(v) => set("dryer", v)}
      />
      <Toggle
        label="Lavanderia compartilhada no prédio"
        value={draft.laundrySharedBuilding}
        onValueChange={(v) => set("laundrySharedBuilding", v)}
      />
      <Toggle
        label="Lavanderia tem custo extra"
        value={draft.laundryExtraCost}
        onValueChange={(v) => set("laundryExtraCost", v)}
      />
      <SectionTitle>Comodidades</SectionTitle>
      <MultiChoice
        label="Cozinha"
        options={kitchen}
        values={draft.kitchenAmenities}
        onChange={(v) => set("kitchenAmenities", v)}
      />
      <MultiChoice
        label="Área externa"
        options={outdoor}
        values={draft.outdoorAmenities}
        onChange={(v) => set("outdoorAmenities", v)}
      />
      <SectionTitle>Estacionamento</SectionTitle>
      <Toggle
        label="Carro"
        value={draft.carParkingAvailable}
        onValueChange={(v) => set("carParkingAvailable", v)}
      />
      <Toggle
        label="Moto"
        value={draft.motorbikeParkingAvailable}
        onValueChange={(v) => set("motorbikeParkingAvailable", v)}
      />
      <Toggle
        label="Bicicleta"
        value={draft.bicycleParkingAvailable}
        onValueChange={(v) => set("bicycleParkingAvailable", v)}
      />
      <Toggle
        label="Estacionamento pago"
        value={draft.parkingPaid}
        onValueChange={(v) => set("parkingPaid", v)}
      />
      <Toggle
        label="Estacionamento seguro"
        value={draft.parkingSecure}
        onValueChange={(v) => set("parkingSecure", v)}
      />
    </>
  );
}
