import { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { resolveMediaUrl } from "@/api/media";
import {
  getMyListing,
  pauseListing,
  reactivateListing,
  renewListing,
  resubmitListing,
  uploadListingPhoto,
  type OwnerListing,
} from "@/api/owner-listings";
import { AppButton } from "@/components/ui/AppButton";
import { useSession } from "@/session/SessionContext";
import { colors, radius, spacing } from "@/theme/tokens";

const statusLabels: Record<OwnerListing["status"], string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Em análise",
  ACTIVE: "Publicado",
  PAUSED: "Pausado",
  CLOSED: "Encerrado",
  REJECTED: "Correção necessária",
};

export default function ListingOwnerScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id);
  const { session, signOut } = useSession();
  const [item, setItem] = useState<OwnerListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      router.replace({
        pathname: "/login",
        params: { returnTo: `/listing-owner/${id}` },
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const nextItem = await getMyListing(id, session.accessToken);
      setItem(nextItem);
      setSelectedPhotoId((current) => {
        if (current && nextItem.photos.some((photo) => photo.id === current)) {
          return current;
        }
        return nextItem.photos[0]?.id ?? null;
      });
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError("Não foi possível carregar este anúncio.");
    } finally {
      setLoading(false);
    }
  }, [id, session, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPhoto = useMemo(() => {
    if (!item?.photos.length) return null;
    return (
      item.photos.find((photo) => photo.id === selectedPhotoId) ?? item.photos[0]
    );
  }, [item, selectedPhotoId]);

  const runAction = async (
    label: string,
    action: () => Promise<OwnerListing>,
  ) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      setItem(await action());
      setSuccess(label);
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError("A ação não pôde ser concluída no estado atual do anúncio.");
    } finally {
      setBusy(false);
    }
  };

  const addPhoto = async () => {
    if (!session) return;
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.9,
      exif: false,
      base64: false,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    setBusy(true);
    try {
      const extension = asset.mimeType?.split("/")[1] ?? "jpg";
      const uploaded = await uploadListingPhoto(
        id,
        {
          uri: asset.uri,
          name: asset.fileName ?? `morada-listing.${extension}`,
          type: asset.mimeType ?? "image/jpeg",
        },
        session.accessToken,
      );
      setSelectedPhotoId(uploaded.id);
      await load();
      setSuccess("Foto adicionada.");
    } catch (caught) {
      if ((caught as Error & { status?: number }).status === 401) {
        signOut();
        router.replace("/login");
        return;
      }
      setError(
        "Não foi possível enviar a foto. Use uma imagem válida de até 10 MB.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.muted}>Carregando anúncio...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Anúncio indisponível</Text>
        <Text style={styles.error}>{error ?? "Tente novamente."}</Text>
        <AppButton label="Tentar novamente" onPress={() => void load()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {item.title}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{statusLabels[item.status]}</Text>
        </View>
        <Text style={styles.muted}>
          {[item.location.area, item.location.city]
            .filter(Boolean)
            .join(" · ") || "Localização ainda não informada"}
        </Text>
        {item.moderation.rejectionReason ? (
          <Text style={styles.error}>
            Correção: {item.moderation.rejectionReason}
          </Text>
        ) : null}
        {item.moderation.pausedReason ? (
          <Text style={styles.warning}>
            Pausa: {item.moderation.pausedReason}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Fotos do anúncio</Text>
        <Text style={styles.muted}>
          {item.photos.length} foto{item.photos.length === 1 ? "" : "s"}{" "}
          cadastrada
          {item.photos.length === 1 ? "" : "s"}.
        </Text>

        {selectedPhoto ? (
          <View style={styles.gallery}>
            <View style={styles.coverWrap}>
              <Image
                accessibilityLabel="Prévia da foto selecionada do anúncio"
                resizeMode="cover"
                source={{ uri: resolveMediaUrl(selectedPhoto.url) }}
                style={styles.coverImage}
              />
              {selectedPhoto.position === 0 ? (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>Capa</Text>
                </View>
              ) : null}
            </View>

            {item.photos.length > 1 ? (
              <ScrollView
                contentContainerStyle={styles.thumbnailRow}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {item.photos.map((photo) => {
                  const selected = photo.id === selectedPhoto.id;
                  return (
                    <Pressable
                      accessibilityLabel={`Visualizar foto ${photo.position + 1}`}
                      accessibilityRole="button"
                      key={photo.id}
                      onPress={() => setSelectedPhotoId(photo.id)}
                      style={[
                        styles.thumbnailButton,
                        selected && styles.thumbnailButtonSelected,
                      ]}
                    >
                      <Image
                        resizeMode="cover"
                        source={{ uri: resolveMediaUrl(photo.url) }}
                        style={styles.thumbnailImage}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyPhotos}>
            <Text style={styles.muted}>
              Adicione a primeira foto para criar a prévia do anúncio.
            </Text>
          </View>
        )}

        <AppButton
          disabled={busy || item.status === "CLOSED"}
          label="Adicionar foto"
          onPress={() => void addPhoto()}
          variant="secondary"
        />
        <AppButton
          disabled={busy || item.status === "CLOSED"}
          label="Editar informações"
          onPress={() =>
            router.push({ pathname: "/listing-editor", params: { id } })
          }
          variant="secondary"
        />
        <AppButton
          disabled={busy || item.status === "CLOSED"}
          label="Localização privada"
          onPress={() =>
            router.push({ pathname: "/listing-location", params: { id } })
          }
          variant="secondary"
        />
        <AppButton
          disabled={busy || item.status === "CLOSED"}
          label="Comprovar autorização"
          onPress={() =>
            router.push({ pathname: "/listing-authorization", params: { id } })
          }
          variant="secondary"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Status do anúncio</Text>
        <Text style={styles.muted}>
          Moderação, reenvio e renovação são decididos pelo servidor. O app não
          publica nem aprova anúncios por conta própria.
        </Text>
        {item.status === "ACTIVE" ? (
          <>
            <AppButton
              disabled={busy}
              label="Pausar anúncio"
              onPress={() =>
                void runAction("Anúncio pausado.", () =>
                  pauseListing(id, session!.accessToken),
                )
              }
              variant="secondary"
            />
            <AppButton
              disabled={busy}
              label="Renovar anúncio"
              onPress={() =>
                void runAction("Renovação solicitada.", () =>
                  renewListing(id, session!.accessToken),
                )
              }
              variant="secondary"
            />
          </>
        ) : null}
        {item.status === "PAUSED" ? (
          <AppButton
            disabled={busy}
            label="Reativar anúncio"
            onPress={() =>
              void runAction("Anúncio reativado.", () =>
                reactivateListing(id, session!.accessToken),
              )
            }
          />
        ) : null}
        {item.status === "REJECTED" ? (
          <AppButton
            disabled={busy}
            label="Reenviar para análise"
            onPress={() =>
              void runAction("Anúncio reenviado para análise.", () =>
                resubmitListing(id, session!.accessToken),
              )
            }
          />
        ) : null}
        {item.status !== "CLOSED" ? (
          <AppButton
            disabled={busy}
            label="Encerrar anúncio"
            onPress={() =>
              router.push({ pathname: "/listing-close", params: { id } })
            }
            variant="secondary"
          />
        ) : null}
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {success ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            {success}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 25, fontWeight: "900" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  muted: { color: colors.textMuted, lineHeight: 21 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: { color: colors.primary, fontWeight: "800" },
  gallery: { gap: spacing.sm },
  coverWrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  coverImage: { width: "100%", aspectRatio: 4 / 3 },
  coverBadge: {
    position: "absolute",
    left: spacing.sm,
    top: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  coverBadgeText: { color: colors.text, fontWeight: "800" },
  thumbnailRow: { gap: spacing.sm },
  thumbnailButton: {
    overflow: "hidden",
    width: 76,
    height: 76,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: radius.md,
  },
  thumbnailButtonSelected: { borderColor: colors.primary },
  thumbnailImage: { width: "100%", height: "100%" },
  emptyPhotos: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  error: { color: colors.danger, lineHeight: 20 },
  warning: { color: colors.warning, lineHeight: 20 },
  success: { color: colors.success, fontWeight: "700" },
});
