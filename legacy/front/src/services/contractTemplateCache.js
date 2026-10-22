import { contractTemplateService } from './contractTemplateService';
import { applyContractTemplateCache } from '../constants/contractTemplates';

// 계약서 서식 템플릿 캐시 — 프로그램 실행 시 로드, 메뉴 진입 시 사용
//  - localStorage에 { ver, items } 저장 → 재실행 시 즉시 하이드레이트
//  - 서버 ver 이 다를 때만 재fetch (가벼운 갱신 감지)
//  - 실패 시 캐시/내장 서식으로 폴백(앱 동작 유지)
const LS_KEY = 'contract_templates_cache';

const readLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } };
const writeLS = (ver, items) => { try { localStorage.setItem(LS_KEY, JSON.stringify({ ver, items })); } catch { /* noop */ } };

// 앱 시작 시 동기 하이드레이트(네트워크 전 즉시 오버라이드 반영)
export function hydrateContractTemplateCache() {
  const cached = readLS();
  if (cached?.items) applyContractTemplateCache(cached.items);
}

// 네트워크 로드/갱신. force=true면 ver 무시하고 강제 재fetch(관리자 저장 후 호출)
export async function loadContractTemplates(force = false) {
  try {
    const cached = readLS();
    if (!force && cached?.ver != null) {
      const v = await contractTemplateService.version();
      const serverVer = v?.data?.ver ?? v?.data?.Ver;
      if (serverVer != null && Number(serverVer) === Number(cached.ver)) {
        applyContractTemplateCache(cached.items || []);
        return cached.items || [];
      }
    }
    const res = await contractTemplateService.list();
    const items = res?.data?.items ?? res?.data?.Items ?? [];
    const ver = res?.data?.ver ?? res?.data?.Ver ?? 0;
    if (items.length) { applyContractTemplateCache(items); writeLS(ver, items); }
    return items;
  } catch {
    // 서버 미배포/오류 → 기존 캐시(하이드레이트됨) 또는 내장 서식으로 동작
    return [];
  }
}
