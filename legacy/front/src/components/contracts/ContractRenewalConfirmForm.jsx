import { useState } from 'react';
import { X, Printer } from 'lucide-react';

/**
 * 계약갱신요구권 행사 여부 확인서 (법정서식 아님, 부동산거래관리시스템 참고 서식) — A4 1쪽
 *  - 매도인(임대인) 정보 / 목적물 / 현 임차인 임대차기간 / 계약갱신요구권 행사 여부.
 *  - 새 창(taf-root) 렌더 → 인쇄. 저장은 contract_document(doc_kind)로 위임(onSave).
 */
const BLANK = {
  성명: '', 주민번호: '', 주소: '', 목적물: '',
  임대차_시작: '', 임대차_종료: '',
  행사여부: '기행사', // 기행사 | 행사 | 불행사 | 미결정 | 해당없음
  기행사_시작: '', 기행사_종료: '',
  갱신_시작: '', 갱신_종료: '',
  불행사_확인자: '',
  첨부부수: '',
  확인_년: '', 확인_월: '', 확인_일: '', 확인자: '',
};

export default function ContractRenewalConfirmForm({ onClose, initial = null, onSave = null }) {
  const [f, setF] = useState(initial && typeof initial === 'object' ? { ...BLANK, ...initial } : BLANK);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const pick = (v) => setF((p) => ({ ...p, 행사여부: v }));
  const In = (k, ph, style) => <input value={f[k] ?? ''} onChange={set(k)} placeholder={ph || ''} className="taf-in" style={style} />;
  const box = (v) => (f.행사여부 === v ? '√' : ' ');
  const range = (sk, ek) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', width: '100%' }}>
      {In(sk, '', { display: 'inline-block', flex: 1, minWidth: 0 })}<span>~</span>{In(ek, '', { display: 'inline-block', flex: 1, minWidth: 0 })}
    </span>
  );

  return (
    <div className="taf-root">
      <style>{`
        .taf-root { position: fixed; inset: 0; background: #eef1f5; overflow: auto; display: flex; flex-direction: column; }
        .taf-bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
        .taf-bar h2 { font-size: 14px; font-weight: 700; color: #111827; margin: 0; }
        .taf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #374151; cursor: pointer; }
        .taf-btn.primary { background: #4f46e5; border-color: #4f46e5; color: white; }
        .taf-page { width: 210mm; min-height: 297mm; margin: 14px auto; background: white; padding: 10mm 12mm; box-sizing: border-box; box-shadow: 0 2px 14px rgba(0,0,0,.15); font-family: 'Malgun Gothic','맑은 고딕',sans-serif; color: #111; font-size: 13px; line-height: 1.5; display: flex; flex-direction: column; }
        .taf-title { text-align: center; font-size: 20px; font-weight: 800; letter-spacing: 1px; background: #d8d8d8; border: 1px solid #333; padding: 8px 0; margin: 0 0 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .taf-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; border-top: none; }
        .taf-tbl td { border: 1px solid #333; padding: 4px 6px; vertical-align: middle; font-size: 13px; }
        .taf-l { text-align: center; font-weight: 700; background: #f2f2f2; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .taf-in { width: 100%; border: none; background: #eaf7ef; padding: 4px 5px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
        .taf-chk { font-weight: 700; white-space: nowrap; text-align: center; cursor: pointer; }
        .taf-note { font-size: 11px; color: #222; line-height: 1.6; }
        .taf-sign { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin: 6px 0; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
          .taf-root { position: static; background: white; overflow: visible; }
          .taf-page { margin: 0; box-shadow: none; width: auto; min-height: 96vh; padding: 0; }
          /* 인쇄 시 회색 헤더/제목 배경 유지 */
          .taf-title, .taf-l { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4; margin: 20mm 20mm 10mm 20mm; }
        }
      `}</style>

      <div className="taf-bar no-print">
        <h2>계약갱신요구권 행사 여부 확인서</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onSave && <button className="taf-btn" style={{ background: '#059669', borderColor: '#059669', color: 'white' }} onClick={async () => { const ok = await onSave(f); if (ok) onClose?.(); }}>저장</button>}
          <button className="taf-btn primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> 인쇄 / 미리보기</button>
          {onClose && <button className="taf-btn" onClick={onClose}><X className="w-4 h-4" /> 닫기</button>}
        </div>
      </div>

      <div className="taf-page">
        <div className="taf-title">계약갱신요구권 행사 여부 확인서</div>

        {/* 매도인/목적물/임대차기간 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '16%' }} /><col style={{ width: '18%' }} /><col style={{ width: '28%' }} /><col style={{ width: '20%' }} /><col style={{ width: '18%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={2}>매도인<br />(임대인)</td>
              <td className="taf-l">성명<br />(법인명)</td>
              <td>{In('성명')}</td>
              <td className="taf-l">주민등록번호<br />(법인등록번호)</td>
              <td>{In('주민번호')}</td>
            </tr>
            <tr>
              <td className="taf-l">주소</td>
              <td colSpan={3}>{In('주소')}</td>
            </tr>
            <tr>
              <td className="taf-l">목적물</td>
              <td colSpan={4}>{In('목적물')}</td>
            </tr>
            <tr>
              <td className="taf-l">현 임차인의<br />임대차기간</td>
              <td colSpan={4}>{range('임대차_시작', '임대차_종료')}</td>
            </tr>
          </tbody>
        </table>

        {/* 계약갱신요구권 행사 여부 */}
        <table className="taf-tbl">
          <colgroup><col style={{ width: '16%' }} /><col style={{ width: '13%' }} /><col style={{ width: '7%' }} /><col style={{ width: '30%' }} /><col style={{ width: '34%' }} /></colgroup>
          <tbody>
            <tr>
              <td className="taf-l" rowSpan={5}>계약갱신요구권<br />행사 여부</td>
              <td className="taf-l">기행사</td>
              <td className="taf-chk" onClick={() => pick('기행사')}>[ {box('기행사')} ]</td>
              <td className="taf-l" style={{ background: '#fff' }}>임대차 기간</td>
              <td>{range('기행사_시작', '기행사_종료')}</td>
            </tr>
            <tr>
              <td className="taf-l">행사</td>
              <td className="taf-chk" onClick={() => pick('행사')}>[ {box('행사')} ]</td>
              <td className="taf-l" style={{ background: '#fff' }}>갱신 후 임대차 기간</td>
              <td>{range('갱신_시작', '갱신_종료')}</td>
            </tr>
            <tr>
              <td className="taf-l">불행사</td>
              <td className="taf-chk" onClick={() => pick('불행사')}>[ {box('불행사')} ]</td>
              <td colSpan={2} style={{ fontSize: '12px', lineHeight: 1.55 }}>
                <div style={{ fontStyle: 'italic' }}>계약갱신요구권을 행사하지 않기로 합의하였으며 임차인은 이 내용이 사실과 틀림없음을 확인합니다.</div>
                <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>확인자 : {In('불행사_확인자', '', { width: '140px' })}<span style={{ whiteSpace: 'nowrap', color: '#555' }}>(서명 또는 인)</span></div>
              </td>
            </tr>
            <tr>
              <td className="taf-l">미결정</td>
              <td className="taf-chk" onClick={() => pick('미결정')}>[ {box('미결정')} ]</td>
              <td colSpan={2} style={{ fontSize: '12px' }}>예) 응답이 없거나 결정을 보류하는 경우 등</td>
            </tr>
            <tr>
              <td className="taf-l">해당사항<br />없음</td>
              <td className="taf-chk" onClick={() => pick('해당없음')}>[ {box('해당없음')} ]</td>
              <td colSpan={2} style={{ fontSize: '12px', lineHeight: 1.55 }}>예) 1. 임대인이 실거주하고 있는 경우<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2. 계약갱신요구권 행사기간이 도래하지 않은 경우</td>
            </tr>
          </tbody>
        </table>

        <div className="taf-note" style={{ marginTop: '8px' }}>
          ※ 계약갱신요구권 행사는 임대차기간이 끝나기 6개월 전부터 1개월 전까지의 기간에 가능<br />
          &nbsp;&nbsp;(단, ‘20.12.10. 이후 최초로 체결되거나 갱신된 계약에 대한 계약갱신요구권 행사는 임대차기간이 끝나기 6개월 전부터 2개월 전까지의 기간에 가능)
        </div>

        {/* 우하단 고정 — 남는 공간을 흡수해 A4 하단에 붙임 */}
        <div style={{ marginTop: 'auto', paddingTop: '24px', fontSize: '13px' }}>
          <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>※ 첨부 : 임대차계약서 사본 {In('첨부부수', '', { width: '60px' })} 부. &nbsp;끝.</div>
          <div style={{ marginBottom: '18px' }}>매도인(임대인)은 위 내용이 사실과 틀림없음을 확인합니다.</div>
          <div className="taf-sign">
            {In('확인_년', '', { display: 'inline-block', width: '54px', textAlign: 'center' })}<span>년</span>
            {In('확인_월', '', { display: 'inline-block', width: '44px', textAlign: 'center' })}<span>월</span>
            {In('확인_일', '', { display: 'inline-block', width: '44px', textAlign: 'center' })}<span>일</span>
          </div>
          <div className="taf-sign" style={{ marginTop: '12px' }}>
            <span style={{ fontWeight: 700 }}>확인자 : 매도인(임대인)</span>{In('확인자', '', { width: '160px' })}<span style={{ whiteSpace: 'nowrap' }}>(서명 또는 인)</span>
          </div>
          <div style={{ marginTop: '16px', fontSize: '11px', color: '#333', lineHeight: 1.6 }}>
            * 해당 서식은 법정 서식이 아니므로 일정 부분 개별 사항에 맞게 수정하여 사용이 가능합니다.<br />
            &nbsp;예) 서식 하단 확인자에 매도인(임대인) 대신에 현 임차인의 서명을 받거나 추가로 기입이 가능하고, 불행사 기재란에 임차인 확인은 상황에 맞게 삭제하셔도 됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
