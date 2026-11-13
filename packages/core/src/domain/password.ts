/** Requisitos de senha. O Supabase Auth local aplica os mesmos (config.toml). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // limite do bcrypt

/**
 * Lista local de senhas comuns (SECURITY.md §2: sem API externa).
 * Comparação sem diferenciar maiúsculas. Amplie à vontade, mantendo minúsculas.
 */
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234',
  'password', 'password1', 'password123', 'senha123', 'senha1234', 'senhasenha', 'mudar123',
  'qwerty123', 'qwertyui', 'abc12345', 'abcd1234', 'a1b2c3d4', '1q2w3e4r', '1qaz2wsx',
  'iloveyou1', 'admin123', 'admin1234', 'welcome1', 'letmein1', 'brasil123', 'flamengo1',
  'corinthians1', 'palmeiras1', 'jiujitsu1', 'jiujitsu123', 'muaythai1', 'figtherz1', 'figtherz123',
]);

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

export function hasLettersAndDigits(password: string): boolean {
  return /\p{L}/u.test(password) && /\d/.test(password);
}
