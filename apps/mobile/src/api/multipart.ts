import { Platform } from "react-native";

export type LocalMultipartFile = {
  uri: string;
  name: string;
  type: string;
};

/**
 * Appends an Expo picker file to FormData using the representation expected by
 * each runtime. React Native accepts the local { uri, name, type } descriptor,
 * while browsers require an actual Blob/File body.
 */
export async function appendMultipartFile(
  form: FormData,
  field: string,
  file: LocalMultipartFile,
) {
  if (Platform.OS !== "web") {
    form.append(field, file as unknown as Blob);
    return;
  }

  const response = await fetch(file.uri);
  if (!response.ok) {
    throw new Error(`Unable to read selected file (${response.status}).`);
  }

  const blob = await response.blob();
  const mimeType = file.type || blob.type || "application/octet-stream";

  if (typeof File !== "undefined") {
    form.append(field, new File([blob], file.name, { type: mimeType }));
    return;
  }

  form.append(field, blob, file.name);
}
