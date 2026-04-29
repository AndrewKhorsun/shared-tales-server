export const VALID_TOKEN = "valid.test.token";

export function authHeader(token: string = VALID_TOKEN): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
