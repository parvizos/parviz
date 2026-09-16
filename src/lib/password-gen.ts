// Генерация и оценка паролей. Только клиент (crypto.getRandomValues).

// Без похожих символов (I/l/1/O/0) — чтобы легко перепечатать при нужде.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const SYMBOLS = "!@#$%^&*-_=+.?";

export function generatePassword(length = 20, symbols = true): string {
  const chars = symbols ? ALPHABET + SYMBOLS : ALPHABET;
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

export type Strength = { score: 0 | 1 | 2 | 3; label: string; color: string };

export function passwordStrength(pw: string): Strength {
  if (!pw) return { score: 0, label: "", color: "var(--faint)" };
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/[0-9]/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;
  const long = pw.length >= 16 ? 2 : pw.length >= 12 ? 1 : 0;
  const raw = variety + long; // 0..6
  if (pw.length < 8 || raw <= 2)
    return { score: 1, label: "Слабый", color: "var(--danger)" };
  if (raw <= 4) return { score: 2, label: "Нормальный", color: "var(--warning)" };
  return { score: 3, label: "Сильный", color: "var(--success)" };
}
