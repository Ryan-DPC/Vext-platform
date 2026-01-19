import crypto from 'crypto';

const stringToSign = 'overwrite=1&public_id=assets/default-game&timestamp=1768824439';
const targetSignature = '3dc2f844d54ff38ff56786a4247a86b31b9a0b83';

const chars9 = ['I', 'l', '1'];
const chars13 = ['I', 'l', '1'];
const chars14 = ['I', 'l', '1'];
// Additional ambiguous spots
const chars6 = ['i', 'l', 'I', '1']; // civq
const chars8 = ['q', 'g']; // civq
const chars19 = ['r', 'n']; // MMrH
const chars26 = ['8', 'B']; // JPH8

for (const c6 of chars6) {
  for (const c8 of chars8) {
    for (const c9 of chars9) {
      for (const c13 of chars13) {
        for (const c14 of chars14) {
          for (const c19 of chars19) {
            for (const c26 of chars26) {
              const secret = `NS2Hcv${c6}v${c8}${c9}_tH${c13}${c14}CfMMrH${c19}xHxJPH${c26}`;
              // Wait, my template was slightly off. Let's re-verify the base.
              // N S 2 H c i v q I _ t H I I C f M M r H x H x J P H 8
              // 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6
              const secretFixed = `NS2Hci${c6}${c8}${c9}_tH${c13}${c14}CfMM${c19}H${c26}HxHx...`;
              // Re-typing base completely to avoid mistakes:
              // Base: NS2Hci??(5,6)??(7,8)_tH??(12,13)CfMM?H(18,19)?(20)?(21)?(22)?(23)??(24,25)H(26)
              // Actually let's use the most likely base and vary the suspicious ones.
            }
          }
        }
      }
    }
  }
}

// Let's simplify. I will try a very broad set of variations.
const run = () => {
  // NS2HcivqI_tHIICfMMrHxHxJPH8
  const base = 'NS2HcivqI_tHIICfMMrHxHxJPH8'.split('');
  const ambiguous = [
    { pos: 5, options: ['i', 'l', '1'] },
    { pos: 6, options: ['v', 'u'] },
    { pos: 7, options: ['q', 'g'] },
    { pos: 8, options: ['I', 'l', '1'] },
    { pos: 12, options: ['I', 'l', '1'] },
    { pos: 13, options: ['I', 'l', '1'] },
    { pos: 18, options: ['r', 'n'] },
    { pos: 26, options: ['8', 'B'] },
  ];

  const tryAll = (index: number, current: string[]) => {
    if (index === ambiguous.length) {
      const secret = current.join('');
      const hash = crypto
        .createHash('sha1')
        .update(stringToSign + secret)
        .digest('hex');
      if (hash === targetSignature) {
        console.log('MATCH FOUND!');
        console.log('Secret:', secret);
        process.exit(0);
      }
      return;
    }

    const { pos, options } = ambiguous[index];
    for (const opt of options) {
      current[pos] = opt;
      tryAll(index + 1, current);
    }
  };

  tryAll(0, base);
  console.log('No match found in local brute force.');
};

run();
