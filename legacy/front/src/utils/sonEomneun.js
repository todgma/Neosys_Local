import KoreanLunarCalendar from 'korean-lunar-calendar';

/**
 * 손없는날 판별 — 음력 날짜의 끝자리가 9 또는 0인 날(음력 9ㆍ10ㆍ19ㆍ20ㆍ29ㆍ30).
 *  · 손(귀신)이 없다고 하여 이사ㆍ개업 등 길일로 치는 전통. 양력 날짜를 음력으로 변환해 판정.
 */
export function isSonEomneunNal(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (!d || isNaN(d.getTime())) return false;
  try {
    const cal = new KoreanLunarCalendar();
    cal.setSolarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const lunar = cal.getLunarCalendar();
    const day = Number(lunar?.day);
    if (!day) return false;
    const ones = day % 10;
    return ones === 9 || ones === 0;
  } catch {
    return false;
  }
}
