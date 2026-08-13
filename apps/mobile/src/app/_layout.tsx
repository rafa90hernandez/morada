import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SessionProvider } from "@/session/SessionContext";
import { colors } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Entrar" }} />
        <Stack.Screen name="signup" options={{ title: "Criar conta" }} />
        <Stack.Screen name="account" options={{ title: "Minha conta" }} />
        <Stack.Screen
          name="identity-verification"
          options={{ title: "Verificação de identidade" }}
        />
        <Stack.Screen name="favorites" options={{ title: "Favoritos" }} />
        <Stack.Screen name="my-listings" options={{ title: "Meus anúncios" }} />
        <Stack.Screen
          name="listing-editor"
          options={{ title: "Editar anúncio" }}
        />
        <Stack.Screen
          name="listing-owner/[id]"
          options={{ title: "Gerenciar anúncio" }}
        />
        <Stack.Screen
          name="listing-location"
          options={{ title: "Localização privada" }}
        />
        <Stack.Screen
          name="listing-authorization"
          options={{ title: "Direito de anunciar" }}
        />
        <Stack.Screen
          name="listing-close"
          options={{ title: "Encerrar anúncio" }}
        />
        <Stack.Screen
          name="listing/[id]"
          options={{ title: "Detalhes da moradia" }}
        />
        <Stack.Screen
          name="conversations/index"
          options={{ title: "Conversas" }}
        />
        <Stack.Screen
          name="conversations/[id]"
          options={{ title: "Conversa" }}
        />
        <Stack.Screen
          name="notifications"
          options={{ title: "Notificações" }}
        />
      </Stack>
    </SessionProvider>
  );
}
