const { keyHash, normalKey } = await import("../src/utils/tea/key.ts");

const answer = process.argv.slice(2).join(" ");
if (!normalKey(answer)) {
  console.error('usage: npm run roji-key -- "the answer"');
  process.exit(1);
}
console.log(`key read as: ${normalKey(answer)}`);
console.log(`export const KEY_HASH = "${await keyHash(answer)}";`);
