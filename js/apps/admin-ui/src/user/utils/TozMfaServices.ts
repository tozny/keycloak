// adjust path as needed

import { fetchWithError } from "@keycloak/keycloak-admin-client";
import { getAuthorizationHeaders } from "../../utils/getAuthorizationHeaders";
import { useAdminClient } from "../../admin-client";
import { access } from "fs";

const BASE_URL = '/auth/realms';

interface Params {
  realm: string;
  userId: string;
  accessToken: string;
}

interface RegisterData {
  [key: string]: string | number | boolean;
}

export const ToznyMFAServices = {

  initiateTotp: async ({ realm, userId, accessToken }: Params) => {
    const url = `${BASE_URL}/${realm}/user/${userId}/totp/initiate`;
    const res = await fetchWithError(url, {
      headers: {
        ...getAuthorizationHeaders(accessToken)
      }
    });
    return res;
  },

  registerTotp: async ({ realm, userId, accessToken }: Params, data: RegisterData) => {
    const url = `${BASE_URL}/${realm}/user/${userId}/totp/register`;
    const res = await fetchWithError(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthorizationHeaders(accessToken)
        },
      body: JSON.stringify(data),
    });
    return res;
  },

  initiateWebauthn: async ({ realm, userId, accessToken }: Params) => {
    const url = `${BASE_URL}/${realm}/user/${userId}/webauthn/initiate`;
    const res = await fetchWithError(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        ...getAuthorizationHeaders(accessToken)
      },
    });
    return res;
  },

  registerWebauthn: async ({ realm, userId, accessToken }: Params, data: RegisterData) => {
    const url = `${BASE_URL}/${realm}/user/${userId}/webauthn/register`;
    const formBody = new URLSearchParams();

    Object.entries(data).forEach(([key, value]) =>
      formBody.append(key, String(value))
    );

    const res = await fetchWithError(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        ...getAuthorizationHeaders(accessToken)
      },
      body: formBody.toString(),
    });

    return res;
  },
};
