// 숫자 → 한글 금액 표기 (예: 350000000 → 삼억오천만)
const HAN_D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const HAN_S = ['', '십', '백', '천'];
const HAN_B = ['', '만', '억', '조', '경'];

export const hangulAmount = (value) => {
  const n = Math.floor(Number(String(value ?? '').replace(/[^0-9]/g, '')));
  if (!n || isNaN(n)) return '';
  const digits = String(n).split('').reverse();
  const groups = [];
  for (let i = 0; i < digits.length; i += 4) groups.push(digits.slice(i, i + 4));
  let result = '';
  for (let g = groups.length - 1; g >= 0; g--) {
    const grp = groups[g];
    let s = '';
    for (let i = grp.length - 1; i >= 0; i--) { const d = Number(grp[i]); if (d) s += HAN_D[d] + HAN_S[i]; }
    if (s) result += s + HAN_B[g];
  }
  return result;
};

export default hangulAmount;
