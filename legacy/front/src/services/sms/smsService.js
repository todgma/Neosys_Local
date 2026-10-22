import apiClient from '../../utils/apiClient';
import API_ENDPOINTS from '../../config/apiEndpoints';

// 백엔드 응답: { success, data, message } → data 반환
const unwrap = (res) => (res && typeof res === 'object' ? res.data : res);

// 주소록 그룹 목록(중개인 rt_no 단위 — 같은 사무소라도 회원별 분리)
export async function listGroups(rtNo) {
  const res = await apiClient.get(API_ENDPOINTS.sms.groups, { rtNo });
  return unwrap(res) || [];
}

// 그룹 생성(멤버 포함 — 멤버는 생성 시점 고정)
// payload: { offNo, rtNo, groupName, groupMemo, members:[{name,phone,memo}], regId }
export async function createGroup(payload) {
  const res = await apiClient.post(API_ENDPOINTS.sms.groups, payload);
  return unwrap(res);
}

// 그룹명/메모 수정 — payload: { groupName, groupMemo, updId }
export async function updateGroup(groupId, payload) {
  const res = await apiClient.put(API_ENDPOINTS.sms.groupUpdate(groupId), payload);
  return unwrap(res);
}

// 그룹 삭제(논리 삭제)
export async function deleteGroup(groupId) {
  const res = await apiClient.delete(API_ENDPOINTS.sms.groupDelete(groupId));
  return unwrap(res);
}

// 발송 이력(중개인 rt_no 단위) — groupId 생략 시 내 전체
export async function listHistory(rtNo, groupId) {
  const params = (groupId != null) ? { rtNo, groupId } : { rtNo };
  const res = await apiClient.get(API_ENDPOINTS.sms.history, params);
  return unwrap(res) || [];
}

// 문자 전송 기록(실제 전송 시 전송일/내용 자동 적재)
// payload: { offNo, rtNo, groupId, groupName, sendMessage, recipients:[{name,phone}], sendType, regId }
export async function logSend(payload) {
  const res = await apiClient.post(API_ENDPOINTS.sms.send, payload);
  return unwrap(res);
}
