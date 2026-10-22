// 관리자 세션 헬퍼 — 전역 스토어(zustand)를 감싸 비-React(핸들러) 컨텍스트에서도 사용
import { useAdminStore } from '../stores/adminStore';

export const getAdmin = () => useAdminStore.getState().admin;
export const currentAdminId = () => useAdminStore.getState().admin?.adminId || null;
export const isSuper = () => useAdminStore.getState().admin?.role === 'SUPER';
