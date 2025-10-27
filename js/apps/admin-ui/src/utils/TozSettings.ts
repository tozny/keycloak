import { fetchWithError } from "@keycloak/keycloak-admin-client";
import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import { getAuthorizationHeaders } from "../utils/getAuthorizationHeaders";
import { joinPath } from "../utils/joinPath";

export type TozSettings = {
  forgot_password_custom_link?: string;
  forgot_password_custom_text?: string;
};

const endpoint = (baseUrl: string, realmName: string) =>
  joinPath(baseUrl, "admin/realms", encodeURIComponent(realmName), "general", "settings");

export async function getTozSettings(adminClient: KeycloakAdminClient): Promise<TozSettings> {
  const accessToken = await adminClient.getAccessToken();
  const url = endpoint(adminClient.baseUrl, adminClient.realmName!);
  const res = await fetchWithError(url, {
    method: "GET",
    headers: getAuthorizationHeaders(accessToken),
  });
  return (await res.json()) as TozSettings;
}

export async function saveTozSettings(
  adminClient: KeycloakAdminClient,
  settings: TozSettings,
): Promise<void> {
  const accessToken = await adminClient.getAccessToken();
  const url = endpoint(adminClient.baseUrl, adminClient.realmName!);
  const res = await fetchWithError(url, {
    method: "PUT",
    body: JSON.stringify(settings),
    headers: {
      "Content-Type": "application/json",
      ...getAuthorizationHeaders(accessToken),
    },
  });
  if (!res.ok) throw new Error(res.statusText);
}
