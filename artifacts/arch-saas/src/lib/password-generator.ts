const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%*-_";
const ALL = `${UPPERCASE}${LOWERCASE}${NUMBERS}${SYMBOLS}`;

function pick(chars: string): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return chars[values[0] % chars.length] ?? chars[0];
}

function shuffle(value: string[]): string[] {
  const result = [...value];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const swapIndex = values[0] % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function generateStrongPassword(): string {
  const chars = [
    pick(UPPERCASE),
    pick(LOWERCASE),
    pick(NUMBERS),
    pick(SYMBOLS),
  ];

  while (chars.length < 14) {
    chars.push(pick(ALL));
  }

  return shuffle(chars).join("");
}
