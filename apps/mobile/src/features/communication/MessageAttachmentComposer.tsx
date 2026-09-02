import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { StyleSheet, Text, View } from "react-native";

import {
  uploadMessageAttachment,
  type LocalMessageAttachmentFile,
} from "@/api/message-attachments";
import { AppButton } from "@/components/ui/AppButton";
import { colors, spacing } from "@/theme/tokens";

type Props = {
  conversationId: string;
  accessToken: string;
  disabled?: boolean;
  onUploaded: () => Promise<void> | void;
};

export function MessageAttachmentComposer({
  conversationId,
  accessToken,
  disabled = false,
  onUploaded,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: LocalMessageAttachmentFile) => {
    setUploading(true);
    setError(null);
    try {
      await uploadMessageAttachment(conversationId, file, accessToken);
      await onUploaded();
    } catch {
      setError("Não foi possível enviar o anexo agora.");
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.9,
      exif: false,
      base64: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const extension = asset.mimeType?.split("/")[1] ?? "jpg";
    await upload({
      uri: asset.uri,
      name: asset.fileName ?? `morada-message.${extension}`,
      type: asset.mimeType ?? "image/jpeg",
    });
  };

  const pickPdf = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await upload({
      uri: asset.uri,
      name: asset.name || "morada-message.pdf",
      type: asset.mimeType ?? "application/pdf",
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.help}>
        Anexos são privados. Envie somente imagens ou PDF necessários para a
        conversa.
      </Text>
      <View style={styles.actions}>
        <AppButton
          disabled={disabled || uploading}
          label={uploading ? "Enviando..." : "Enviar imagem"}
          onPress={() => void pickImage()}
          variant="secondary"
        />
        <AppButton
          disabled={disabled || uploading}
          label={uploading ? "Enviando..." : "Enviar PDF"}
          onPress={() => void pickPdf()}
          variant="secondary"
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  actions: { gap: spacing.sm },
  help: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontWeight: "700" },
});
