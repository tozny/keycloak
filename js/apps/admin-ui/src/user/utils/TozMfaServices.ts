// adjust path as needed

import { fetchWithError } from "@keycloak/keycloak-admin-client";

const BASE_URL = '/realms';

interface Params {
  realm: string;
  userId: string;
}

interface RegisterData {
  [key: string]: string | number | boolean;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.text();
  try {
    return JSON.parse(data) as T;
  } catch {
    throw new Error('Failed to parse JSON response');
  }
}

export const ToznyMFAServices = {
  initiateTotp: async ({ realm, userId }: Params) => {
    const url = `${BASE_URL}/auth/${realm}/user/${userId}/totp/initiate`;
    const res = await fetchWithError(url);
    return parseJson<any>(res);
  },

  registerTotp: async ({ realm, userId }: Params, data: RegisterData) => {
    const url = `${BASE_URL}/auth/${realm}/user/${userId}/totp/register`;
    const res = await fetchWithError(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJson<any>(res);
  },

  initiateWebauthn: async ({ realm, userId }: Params) => {
    const url = `${BASE_URL}/auth/${realm}/user/${userId}/webauthn/initiate`;
    const res = await fetchWithError(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    });
    return parseJson<any>(res);
  },

  registerWebauthn: async ({ realm, userId }: Params, data: RegisterData) => {
    const url = `${BASE_URL}/auth/${realm}/user/${userId}/webauthn/register`;
    const formBody = new URLSearchParams();

    Object.entries(data).forEach(([key, value]) =>
      formBody.append(key, String(value))
    );

    const res = await fetchWithError(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: formBody.toString(),
    });

    return parseJson<any>(res);
  },
};
