import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { X, MessageSquare, Users, Trash2, Plus, Send, Signal, Wifi, BatteryFull, Folder, Pencil, History } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import ConfirmDialog from '../ui/ConfirmDialog';
import * as smsApi from '../../services/sms/smsService';
import SmsNewGroupForm from './SmsNewGroupForm';

/**
 * 대량문자관리 — 휴대폰 UI로 (1)문자보내기 (2)주소록 관리.
 *  - 주소록(그룹/멤버)·발송이력은 DB(백엔드 api/Sms) 연동.
 *  - 그룹은 같은 사무소라도 회원(중개인 rt_no)별로 조회/관리.
 *  - 멤버는 신규 등록 시점에 고정(수정 불가). 문자 내용 묶음(템플릿)만 localStorage.
 */
const TPL_KEY = 'smsTemplateLibrary_v1';
const TPL_SEED = [
  { name: '매물 안내', text: '[고객명]님 안녕하세요. 문의주신 [매물주소] 매물 안내드립니다. 궁금하신 점 있으시면 연락주세요. - [담당자]' },
  { name: '방문 예약', text: '[고객명]님, 요청하신 매물 방문 일정 안내드립니다. 편하신 시간 회신 부탁드립니다. - [담당자] [연락처]' },
  { name: '계약 축하', text: '[고객명]님, 이번 계약 진심으로 축하드립니다. 잔금까지 잘 마무리될 수 있도록 최선을 다하겠습니다. - [담당자]' },
];
const VARS = ['[고객명]', '[매물주소]', '[담당자]', '[연락처]', '[금액]'];

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const load = (key, seed) => {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return seed;
};
// 한글=2byte, 그 외=1byte (EUC-KR 기준 근사). SMS 90byte 이하 = 단문, 초과 = 장문(LMS)
const byteLen = (s) => [...(s || '')].reduce((n, ch) => n + (ch.charCodeAt(0) > 127 ? 2 : 1), 0);
const parseJsonArr = (v) => { if (Array.isArray(v)) return v; try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };

// DB 그룹/이력 → 컴포넌트 표준형
const normGroup = (g) => {
  const members = parseJsonArr(g.members);
  return {
    groupId: g.groupId,
    name: g.groupName || '',
    memo: g.groupMemo || '',
    editDate: String(g.updDt || g.regDt || '').slice(0, 10),
    members,
    count: (g.memberCount != null ? g.memberCount : members.length),
  };
};
const normHist = (h) => {
  const recv = parseJsonArr(h.recipients);
  return {
    id: h.sendId,
    groupId: h.groupId,
    group: h.groupName || '',
    at: h.regDt,
    count: (h.recipientCount != null ? h.recipientCount : recv.length),
    to: recv.map((r) => r.name || r.phone).filter(Boolean),
    text: h.sendMessage || '',
  };
};

export default function SmsManagerModal({ onClose, page = false }) {
  const [tab, setTab] = useState('send'); // send | addr
  const { user } = useAuthStore();
  const offNo = user?.offNo;
  const rtNo = user?.rtNo;
  const userId = user?.userId;

  // 문자 내용 / 문자묶음(템플릿 — localStorage)
  const [tplLib, setTplLib] = useState(() => load(TPL_KEY, TPL_SEED.map((t) => ({ id: uid(), ...t }))));
  const [msg, setMsg] = useState('');
  const [tplName, setTplName] = useState('');
  const [showTplMgr, setShowTplMgr] = useState(false);
  const taRef = useRef(null);
  useEffect(() => { try { localStorage.setItem(TPL_KEY, JSON.stringify(tplLib)); } catch { /* ignore */ } }, [tplLib]);

  const bytes = useMemo(() => byteLen(msg), [msg]);
  const isLong = bytes > 90;

  const insertVar = (v) => {
    const ta = taRef.current;
    if (!ta) { setMsg((m) => m + v); return; }
    const s = ta.selectionStart ?? msg.length;
    const e = ta.selectionEnd ?? msg.length;
    setMsg(msg.slice(0, s) + v + msg.slice(e));
    requestAnimationFrame(() => { ta.focus(); const p = s + v.length; ta.setSelectionRange(p, p); });
  };
  const saveTpl = () => {
    const text = msg.trim();
    if (!text) return;
    const nm = tplName.trim() || text.split('\n')[0].slice(0, 20);
    setTplLib((p) => [{ id: uid(), name: nm, text }, ...p]);
    setTplName('');
  };
  const loadTpl = (text) => { setMsg(text); setShowTplMgr(false); };
  const removeTpl = (id) => setTplLib((p) => p.filter((x) => x.id !== id));

  // ── 주소록 그룹 / 발송 이력 (DB · rt_no 단위) ──
  const [groups, setGroups] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const reloadGroups = useCallback(async () => {
    if (rtNo == null) return;
    try { const list = await smsApi.listGroups(rtNo); setGroups((list || []).map(normGroup)); }
    catch (e) { console.error('그룹 조회 실패:', e); }
  }, [rtNo]);
  const reloadHistory = useCallback(async () => {
    if (rtNo == null) return;
    try { const list = await smsApi.listHistory(rtNo); setHistory((list || []).map(normHist)); }
    catch (e) { console.error('이력 조회 실패:', e); }
  }, [rtNo]);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (rtNo == null) return;
      setLoading(true);
      try { await Promise.all([reloadGroups(), reloadHistory()]); } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [rtNo, reloadGroups, reloadHistory]);

  const groupNames = useMemo(() => groups.map((g) => g.name), [groups]);
  const groupByName = (name) => groups.find((g) => g.name === name) || null;
  const groupMemoOf = (name) => groupByName(name)?.memo || '';
  const contactsOf = (name) => groupByName(name)?.members || [];
  const sendsOf = (groupId) => history.filter((h) => h.groupId === groupId);
  const fmtDt = (at) => String(at || '').replace('T', ' ').slice(0, 16);

  // 받는 사람 (문자보내기 탭) — 주소록 그룹 단일선택
  const [selGroup, setSelGroup] = useState('');
  const selMembers = useMemo(() => (selGroup ? contactsOf(selGroup) : []), [selGroup, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 모달 상태 ──
  const [confirm, setConfirm] = useState(null);
  const [viewIdx, setViewIdx] = useState(null);   // 멤버 보기(읽기전용)
  const [editIdx, setEditIdx] = useState(null);   // 그룹명 수정
  const [editForm, setEditForm] = useState({ name: '', memo: '' });
  const [historyIdx, setHistoryIdx] = useState(null); // 발송 이력 보기

  // ── 신규 등록 — 새창 팝업(Electron) / 웹 폴백 임베드 ──
  const [showNewGroup, setShowNewGroup] = useState(false); // 웹 폴백(임베드) 모달
  const [saving, setSaving] = useState(false);
  const [newGroupModalId, setNewGroupModalId] = useState(null); // 열려있는 신규등록 창 추적
  const openNewGroup = async () => {
    if (window.electronAPI?.modal?.open) {
      // 이미 열린 신규등록 창이 있으면 새로 열지 말고 포커스(물건관리와 동일)
      if (newGroupModalId && window.electronAPI.modal.focus) {
        try { await window.electronAPI.modal.focus(newGroupModalId); return; } catch { /* 실패 시 새로 오픈 */ }
      }
      try {
        const modalId = await window.electronAPI.modal.open({ type: 'sms-new-group', data: { title: '주소록 그룹 신규 등록' }, width: 820, height: 760, minWidth: 680, minHeight: 600, resizable: true });
        setNewGroupModalId(modalId);
      } catch (e) { console.error('신규 등록 창 열기 실패:', e); setShowNewGroup(true); }
      return;
    }
    setShowNewGroup(true);
  };
  // 신규등록 창 닫힘 → 목록 재조회 + 추적 해제
  useEffect(() => {
    if (!window.electronAPI?.modal?.on) return;
    const cleanup = window.electronAPI.modal.on('closed', ({ modalId, type }) => {
      if (type === 'sms-new-group') {
        reloadGroups();
        setNewGroupModalId((cur) => (cur === modalId ? null : cur));
      }
    });
    return cleanup;
  }, [reloadGroups]);

  // 그룹명/메모 수정
  const openEditGroup = (idx) => { const g = groups[idx]; if (!g) return; setEditIdx(idx); setEditForm({ name: g.name || '', memo: g.memo || '' }); };
  const saveEditGroup = async () => {
    const name = (editForm.name || '').trim();
    if (!name) { alert('그룹명을 입력하세요.'); return; }
    const cur = groups[editIdx];
    if (!cur) { setEditIdx(null); return; }
    if (name !== cur.name && groups.some((g, i) => i !== editIdx && g.name === name)) { alert('이미 있는 그룹명입니다.'); return; }
    setSaving(true);
    try {
      await smsApi.updateGroup(cur.groupId, { groupName: name, groupMemo: (editForm.memo || '').trim(), updId: userId });
      if (selGroup === cur.name) setSelGroup(name);
      await reloadGroups();
      setEditIdx(null);
    } catch (e) {
      console.error('그룹 수정 실패:', e);
      alert('그룹 수정에 실패했습니다.');
    } finally { setSaving(false); }
  };

  const deleteGroupRow = (idx) => {
    const g = groups[idx];
    setConfirm({
      message: `'${g?.name || '이름없음'}' 그룹을 삭제할까요?`,
      onConfirm: async () => {
        try {
          await smsApi.deleteGroup(g.groupId);
          if (selGroup === g.name) setSelGroup('');
          await reloadGroups();
        } catch (e) { console.error('그룹 삭제 실패:', e); alert('그룹 삭제에 실패했습니다.'); }
      },
    });
  };

  const sendMessage = async () => {
    if (!msg.trim()) { alert('문자 내용을 입력하세요.'); return; }
    if (!selGroup || selMembers.length === 0) { alert('받는 그룹을 선택하세요.'); return; }
    const g = groupByName(selGroup);
    const recipients = selMembers.map((c) => ({ name: c.name || '', phone: c.phone || '' }));
    try {
      await smsApi.logSend({ offNo, rtNo, groupId: g?.groupId, groupName: selGroup, sendMessage: msg, recipients, sendType: isLong ? 'LMS' : 'SMS', regId: userId });
      await reloadHistory();
      alert(`'${selGroup}' 그룹 ${selMembers.length}명에게 문자를 전송했습니다.`);
      setMsg('');
    } catch (e) { console.error('발송 기록 실패:', e); alert('문자 전송 기록에 실패했습니다.'); }
  };

  // ── 스타일 ──
  const btn = { padding: '7px 14px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' };
  const primary = { ...btn, background: '#4f46e5', borderColor: '#4f46e5', color: 'white' };
  const send = { ...btn, background: '#15803d', borderColor: '#15803d', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '6px' };
  const chip = { padding: '5px 10px', fontSize: '13px', fontWeight: 600, border: '1px solid #c7d2fe', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', cursor: 'pointer', whiteSpace: 'nowrap' };
  const tabBtn = (on) => ({ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', fontSize: '15px', fontWeight: on ? 800 : 600, border: 'none', borderBottom: on ? '3px solid #4f46e5' : '3px solid transparent', background: 'none', color: on ? '#4f46e5' : '#475569', cursor: 'pointer' });
  const label = { fontSize: '15px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' };
  const field = { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none', color: '#111827' };
  const smsTh = { padding: '5px 4px', fontSize: '14px', fontWeight: 700, color: '#111827', border: '1px solid #cbd5e1', background: '#f1f5f9', textAlign: 'center', whiteSpace: 'nowrap' };
  const smsTd = { padding: '0', border: '1px solid #cbd5e1', fontSize: '13px', color: '#111827', verticalAlign: 'middle' };
  const roCell = { width: '100%', padding: '5px 7px', fontSize: '13px', fontWeight: 600, boxSizing: 'border-box', color: '#111827', fontFamily: 'inherit' };

  const Phone = ({ children }) => (
    <div style={{ width: '300px', flexShrink: 0, alignSelf: 'stretch', background: '#111827', borderRadius: '38px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,.22)', border: '1px solid #0b1220', display: 'flex' }}>
      <div style={{ flex: 1, background: '#f2f4f8', borderRadius: '28px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#4f46e5', color: 'white', padding: '9px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 800 }}>9:41</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Signal className="w-3.5 h-3.5" /><Wifi className="w-3.5 h-3.5" /><BatteryFull className="w-4 h-4" />
          </span>
        </div>
        {children}
      </div>
    </div>
  );

  const body = (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: 'white' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>대량문자관리</div>
        {onClose && <button onClick={onClose} title="닫기" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 18px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
        <button style={tabBtn(tab === 'send')} onClick={() => setTab('send')}><MessageSquare className="w-4 h-4" /> 문자보내기</button>
        <button style={tabBtn(tab === 'addr')} onClick={() => setTab('addr')}><Users className="w-4 h-4" /> 주소록 관리</button>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: tab === 'send' ? '20px' : '0', padding: 0, overflow: 'hidden', justifyContent: tab === 'send' ? 'center' : 'flex-start' }}>
        {tab === 'send' ? (
          <>
            <Phone>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #dbe1ea', background: 'white', fontSize: '15px', fontWeight: 800, color: '#111827' }}>메시지 미리보기</div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px', background: '#e8ebf1' }}>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <span style={{ display: 'inline-block', fontSize: '13px', fontWeight: 700, color: selGroup ? '#3730a3' : '#94a3b8', background: selGroup ? '#e0e7ff' : '#eef1f5', borderRadius: '999px', padding: '4px 12px' }}>
                    {selGroup ? `받는 그룹: ${selGroup} (${selMembers.length}명)` : '받는 그룹을 선택하세요'}
                  </span>
                </div>
                {msg.trim() ? (
                  <div style={{ maxWidth: '85%', background: '#4f46e5', color: 'white', borderRadius: '16px 16px 16px 4px', padding: '10px 13px', fontSize: '13px', fontWeight: 600, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxShadow: '0 1px 2px rgba(0,0,0,.12)' }}>{msg}</div>
                ) : (
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textAlign: 'center', marginTop: '24px' }}>오른쪽에서 문자 내용을 입력하면<br />이곳에 미리보기가 표시됩니다.</div>
                )}
              </div>
              <div style={{ padding: '8px 14px', borderTop: '1px solid #dbe1ea', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{bytes} byte</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: isLong ? '#b45309' : '#15803d' }}>{isLong ? '장문(LMS)' : '단문(SMS)'}</span>
              </div>
            </Phone>

            <div style={{ flex: 1, minWidth: '320px', maxWidth: '560px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ ...label, marginBottom: 0 }}>받는 그룹 {selGroup && <span style={{ color: '#4f46e5' }}>· {selGroup} ({selMembers.length}명)</span>}</label>
              </div>
              <div style={{ marginTop: '6px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', maxHeight: '260px', overflowY: 'auto' }}>
                {groupNames.length === 0 ? (
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', padding: '12px' }}>{loading ? '불러오는 중…' : '주소록 그룹이 없습니다. [주소록 관리] 탭에서 먼저 등록하세요.'}</div>
                ) : groupNames.map((name) => {
                  const cnt = contactsOf(name).length;
                  return (
                    <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderBottom: '1px solid #f4f6f9', cursor: 'pointer', background: selGroup === name ? '#eef2ff' : 'white' }}>
                      <input type="radio" name="sms-recipient-group" checked={selGroup === name} onChange={() => setSelGroup(name)} style={{ width: '15px', height: '15px' }} />
                      <Folder className="w-4 h-4" style={{ color: '#4f46e5', flexShrink: 0 }} />
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>{name}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5' }}>{cnt}명</span>
                      {groupMemoOf(name) && <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600, color: '#64748b' }}>· {groupMemoOf(name)}</span>}
                    </label>
                  );
                })}
              </div>

              <label style={{ ...label, marginTop: '16px' }}>문자 내용</label>
              <textarea
                ref={taRef}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="보낼 문자 내용을 입력하세요. 변수를 넣으면 발송 시 실제 값으로 치환됩니다."
                style={{ ...field, minHeight: '120px', resize: 'vertical', lineHeight: 1.6 }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {VARS.map((v) => <button key={v} type="button" style={chip} onClick={() => insertVar(v)}>{v}</button>)}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" style={{ ...btn, display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowTplMgr(true)}><MessageSquare className="w-4 h-4" /> 문자관리</button>
                <button type="button" style={btn} onClick={() => setMsg('')}>내용 비우기</button>
                <div style={{ flex: 1 }} />
                <button type="button" style={send} onClick={sendMessage}><Send className="w-4 h-4" /> 문자보내기</button>
              </div>
            </div>
          </>
        ) : (
          /* 주소록 관리 — 단일 표(그룹). 행 클릭=멤버보기, 관리=이력·수정·삭제 */
          <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px', boxSizing: 'border-box' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', flexShrink: 0 }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>주소록</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', marginLeft: '10px' }}>{groups.length}개 그룹</span>
                <button type="button" onClick={openNewGroup} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '6px', background: '#4f46e5', color: 'white', cursor: 'pointer' }}><Plus size={14} /> 신규 등록</button>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ ...smsTh, width: '90px', position: 'sticky', top: 0 }}>편집일</th>
                      <th style={{ ...smsTh, width: '160px', position: 'sticky', top: 0 }}>그룹명</th>
                      <th style={{ ...smsTh, position: 'sticky', top: 0 }}>그룹메모</th>
                      <th style={{ ...smsTh, width: '92px', position: 'sticky', top: 0 }}>전송일1</th>
                      <th style={{ ...smsTh, position: 'sticky', top: 0 }}>전송내용1</th>
                      <th style={{ ...smsTh, width: '92px', position: 'sticky', top: 0 }}>전송일2</th>
                      <th style={{ ...smsTh, position: 'sticky', top: 0 }}>전송내용2</th>
                      <th style={{ ...smsTh, width: '92px', position: 'sticky', top: 0 }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: '28px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b', border: '1px solid #cbd5e1' }}>{loading ? '불러오는 중…' : '등록된 그룹이 없습니다. [신규 등록]으로 추가하세요.'}</td></tr>
                    ) : groups.map((g, i) => {
                      const sends = sendsOf(g.groupId); // 최신순 — [0]=전송1, [1]=전송2
                      return (
                        <tr key={g.groupId ?? i} onClick={() => setViewIdx(i)} style={{ cursor: 'pointer' }} title="클릭 시 그룹 멤버 보기">
                          <td style={{ ...smsTd, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{(g.editDate || '').slice(2)}</td>
                          <td style={smsTd}>
                            <div style={{ display: 'flex', alignItems: 'center', ...roCell }}>
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, color: '#111827' }}>{g.name || '(이름없음)'}</span>
                              {g.count > 0 && <span style={{ flexShrink: 0, marginLeft: '6px', fontSize: '12px', fontWeight: 800, color: '#4f46e5' }}>{g.count}명</span>}
                            </div>
                          </td>
                          <td style={smsTd}><div style={{ ...roCell, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>{g.memo || ''}</div></td>
                          <td style={{ ...smsTd, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{sends[0] ? fmtDt(sends[0].at).slice(2, 10) : ''}</td>
                          <td style={smsTd}><div style={{ ...roCell, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>{sends[0]?.text || ''}</div></td>
                          <td style={{ ...smsTd, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{sends[1] ? fmtDt(sends[1].at).slice(2, 10) : ''}</td>
                          <td style={smsTd}><div style={{ ...roCell, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>{sends[1]?.text || ''}</div></td>
                          <td style={{ ...smsTd, textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setHistoryIdx(i); }} title="발송 이력 전체 보기" style={{ border: 'none', background: 'transparent', color: '#0f766e', cursor: 'pointer', display: 'inline-flex', padding: '2px' }}><History size={14} /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); openEditGroup(i); }} title="그룹명 수정" style={{ border: 'none', background: 'transparent', color: '#4f46e5', cursor: 'pointer', display: 'inline-flex', padding: '2px', marginLeft: '4px' }}><Pencil size={14} /></button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); deleteGroupRow(i); }} title="삭제" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', padding: '2px', marginLeft: '4px' }}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 문자묶음 관리 팝업 */}
      {showTplMgr && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowTplMgr(false)}>
          <div style={{ width: '560px', maxWidth: '94%', maxHeight: '86%', background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>문자관리 · 문자묶음</span>
              <button onClick={() => setShowTplMgr(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>
            </div>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #eef1f5' }}>
              <label style={label}>현재 문자 내용을 묶음으로 저장</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="묶음 이름" style={{ ...field, width: '180px', flex: '0 0 auto' }} />
                <button type="button" style={primary} onClick={saveTpl}>묶음 저장</button>
              </div>
              {!msg.trim() && <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginTop: '6px' }}>먼저 문자 내용을 입력하면 현재 내용을 묶음으로 저장할 수 있습니다.</div>}
            </div>
            <div style={{ flex: 1, minHeight: '160px', overflowY: 'auto', padding: '12px 16px' }}>
              {tplLib.length === 0 && <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', padding: '10px' }}>저장된 문자 묶음이 없습니다.</div>}
              {tplLib.map((it) => (
                <div key={it.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '9px 11px', marginBottom: '7px', background: '#fbfcfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                      <button type="button" style={{ ...primary, padding: '4px 12px' }} onClick={() => loadTpl(it.text)}>불러오기</button>
                      <button type="button" style={{ ...btn, padding: '4px 9px', color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => removeTpl(it.id)}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', lineHeight: 1.5, maxHeight: '54px', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{it.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 그룹 멤버 보기 (읽기전용) */}
      {viewIdx != null && groups[viewIdx] && (() => {
        const g = groups[viewIdx];
        const list = g.members || [];
        return (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setViewIdx(null)}>
            <div style={{ width: '440px', maxWidth: '94%', maxHeight: '82%', background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{g.name || '(이름없음)'} · 멤버 {list.length}명</span>
                <button onClick={() => setViewIdx(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>
              </div>
              <div style={{ flex: 1, minHeight: '120px', overflowY: 'auto' }}>
                {list.length === 0 ? (
                  <div style={{ padding: '26px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>이 그룹에 등록된 멤버가 없습니다.</div>
                ) : list.map((c, ci) => (
                  <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', borderBottom: '1px solid #f4f6f9' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', minWidth: '72px' }}>{c.name || '(이름없음)'}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{c.phone || '-'}</span>
                    {c.memo && <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>· {c.memo}</span>}
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 14px', borderTop: '1px solid #eef1f5', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>※ 멤버는 신규 등록 시점에 고정되며 수정할 수 없습니다.</div>
            </div>
          </div>
        );
      })()}

      {/* 그룹명 수정 */}
      {editIdx != null && groups[editIdx] && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 27, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setEditIdx(null)}>
          <div style={{ width: '380px', maxWidth: '94%', background: 'white', borderRadius: '12px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>그룹 수정</span>
              <button onClick={() => setEditIdx(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>
            </div>
            <div style={{ padding: '16px' }}>
              <label style={label}>그룹명 *</label>
              <input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="그룹명" style={{ ...field, marginBottom: '12px' }} autoFocus />
              <label style={label}>그룹메모</label>
              <input value={editForm.memo} onChange={(e) => setEditForm((p) => ({ ...p, memo: e.target.value }))} placeholder="그룹메모" style={field} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" style={btn} onClick={() => setEditIdx(null)}>취소</button>
                <button type="button" style={primary} disabled={saving} onClick={saveEditGroup}>{saving ? '저장 중…' : '저장'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 그룹 발송 이력 전체 보기 */}
      {historyIdx != null && groups[historyIdx] && (() => {
        const g = groups[historyIdx];
        const sends = sendsOf(g.groupId);
        return (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setHistoryIdx(null)}>
            <div style={{ width: '620px', maxWidth: '94%', maxHeight: '82%', background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>{g.name || '(이름없음)'} · 발송 이력 {sends.length}건</span>
                <button onClick={() => setHistoryIdx(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#334155', display: 'inline-flex' }}><X className="w-6 h-6" /></button>
              </div>
              <div style={{ flex: 1, minHeight: '160px', overflow: 'auto', background: 'white' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ ...smsTh, width: '140px', position: 'sticky', top: 0 }}>전송일시</th>
                      <th style={{ ...smsTh, width: '70px', position: 'sticky', top: 0 }}>인원</th>
                      <th style={{ ...smsTh, position: 'sticky', top: 0 }}>내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sends.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: '28px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#94a3b8', border: '1px solid #cbd5e1' }}>이 그룹으로 발송한 이력이 없습니다.</td></tr>
                    ) : sends.map((s) => (
                      <tr key={s.id}>
                        <td style={{ ...smsTd, textAlign: 'center', padding: '6px 7px' }}>{fmtDt(s.at)}</td>
                        <td style={{ ...smsTd, textAlign: 'center', padding: '6px 7px' }}>{s.count}명</td>
                        <td style={{ ...smsTd, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '6px 9px' }}>{s.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 주소록 그룹 신규 등록 — 웹 폴백(임베드). Electron에서는 새창 팝업으로 열림 */}
      {showNewGroup && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 25, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowNewGroup(false)}>
          <div style={{ width: '820px', maxWidth: '96%', height: '720px', maxHeight: '92%', background: 'white', borderRadius: '12px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <SmsNewGroupForm onClose={() => setShowNewGroup(false)} onCreated={reloadGroups} />
          </div>
        </div>
      )}

      {/* 공통 확인 모달 (window.confirm 대체) */}
      <ConfirmDialog
        open={!!confirm}
        message={confirm?.message}
        onConfirm={() => { confirm?.onConfirm?.(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );

  if (page) {
    return <div style={{ position: 'fixed', inset: 0, background: 'white', display: 'flex', flexDirection: 'column' }}>{body}</div>;
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ width: '1000px', maxWidth: '96vw', height: '720px', maxHeight: '94vh', background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {body}
      </div>
    </div>
  );
}
