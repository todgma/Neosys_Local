// 거래관련서식 / 자료실 서류 목록 — 계약서작성·대시보드 자료실 공용
//  실제 파일은 front/public/forms/ 에 "<이름>.hwp" 로 추후 배치.
export const TRADE_FORMS = [
  '계약갱신요구권행사여부확인서',
  '주택자금조달계획서',
  '토지자금조달계획서',
  '주민등록전입세대열람신청서',
  '(주거용)임대차정보제공요청서',
  '(상가건물용)임대차정보제공요청서',
  '미납국세 등 열람신청서',
  '미납지방세 등 열람신청서',
  '임대보증금 일부보증에 대한 임차인동의서',
  '임대보증금 미가입에 대한 임차인동의서',
];

export const formFileName = (name) => `${name}.hwp`;
// Electron base:'./' 대응 상대경로
export const formUrl = (name) => `./forms/${encodeURIComponent(formFileName(name))}`;

// 단일 서류 다운로드 — 저장 위치 선택 다이얼로그 지원 시 사용, 아니면 기본 다운로드.
//  파일이 없으면 throw(호출측에서 안내 토스트). 사용자가 저장 취소 시 AbortError.
export async function downloadForm(name) {
  const fileName = formFileName(name);
  const res = await fetch(formUrl(name));
  if (!res.ok) throw new Error('not-found');
  const blob = await res.blob();
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({ suggestedName: fileName });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } else {
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(objUrl);
  }
}
