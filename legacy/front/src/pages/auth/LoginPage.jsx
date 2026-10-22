import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import SignupPage from './SignupPage';
import { authService } from '../../services/authService';
import chatImg from '../../assets/chat.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [rememberId, setRememberId] = useState(false); // 아이디 저장

  // 회원가입 — Electron이면 새 창 팝업, 아니면 인페이지 풀스크린 폴백
  const openSignup = () => {
    if (window.electronAPI?.modal?.open) {
      window.electronAPI.modal.open({ type: 'signup', data: { title: '회원가입' }, width: 780, height: 720, minWidth: 560, minHeight: 560, resizable: true })
        .catch(() => setIsSignupModalOpen(true));
    } else {
      setIsSignupModalOpen(true);
    }
  };
  const { login, isLoading } = useAuthStore();
  const emailRef = useRef(null);

  // 로그아웃 직후 입력창 포커스가 막히는 문제 방지
  // (모달이 남긴 body 스타일/오버레이 정리 + 윈도우 포커스 복구 + ID칸 자동 포커스)
  useEffect(() => {
    try {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.documentElement.style.overflow = '';
    } catch (e) {
      // ignore
    }
    if (typeof window !== 'undefined' && typeof window.focus === 'function') {
      window.focus();
    }
    const timer = setTimeout(() => {
      emailRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // 아이디 저장 초기화 + 회원가입 완료 시 아이디 자동입력(prefillLoginId)
  useEffect(() => {
    try {
      const remember = localStorage.getItem('rememberLoginId') === 'true';
      setRememberId(remember);
      const saved = localStorage.getItem('savedLoginId');
      if (remember && saved) setEmail(saved);
      const prefill = localStorage.getItem('prefillLoginId');
      if (prefill) { setEmail(prefill); localStorage.removeItem('prefillLoginId'); }
    } catch { /* ignore */ }
  }, []);

  // 회원가입(별도 창)이 닫혀 로그인 창이 다시 포커스되면 아이디 자동입력 반영
  useEffect(() => {
    const onFocus = () => {
      try { const p = localStorage.getItem('prefillLoginId'); if (p) { setEmail(p); localStorage.removeItem('prefillLoginId'); emailRef.current?.focus(); } } catch { /* ignore */ }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // 인페이지 회원가입 모달(폴백)이 닫힐 때 아이디 자동입력 반영
  useEffect(() => {
    if (!isSignupModalOpen) {
      try { const p = localStorage.getItem('prefillLoginId'); if (p) { setEmail(p); localStorage.removeItem('prefillLoginId'); } } catch { /* ignore */ }
    }
  }, [isSignupModalOpen]);

  const toggleRememberId = (checked) => {
    setRememberId(checked);
    try {
      localStorage.setItem('rememberLoginId', checked ? 'true' : 'false');
      if (!checked) localStorage.removeItem('savedLoginId');
      else if (email) localStorage.setItem('savedLoginId', email);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 무조건 자동 로그인 설정
    localStorage.setItem('rememberMe', 'true');

    const success = await login(email, password);

    if (success) {
      // 아이디 저장 체크 시 로그인 성공한 아이디 보관
      try { if (rememberId) localStorage.setItem('savedLoginId', email); } catch { /* noop */ }
      // 로그인 이력 기록(수동) — 서버에서 IP 캡처
      try { const u = useAuthStore.getState().user; authService.logLogin(u?.userId || email, 'MANUAL'); } catch { /* noop */ }
      // 토스트 알림 (회원가입 등과 동일한 react-hot-toast)
      toast.success('로그인 성공!');

      // 사무실 정보 확인 후 이동
      const { office } = useAuthStore.getState();
      setTimeout(() => {
        if (!office || office.offNo === 0) {
          // 사무실 정보가 없으면 사무실 정보 입력 화면으로 이동
          navigate('/agents/office-management');
        } else {
          // 사무실 정보가 있으면 대시보드로 이동
          navigate('/dashboard');
        }
      }, 500);
    }
  };

  const handleSignup = async (formData) => {
    try {
      await authService.register(formData);
      alert('회원가입이 완료되었습니다.');
      setIsSignupModalOpen(false);
    } catch (error) {
      alert(error.message || '회원가입에 실패했습니다.');
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center w-full px-4 py-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            네오시스
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            계정에 로그인하세요
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              아이디
            </label>
            <input
              id="email"
              name="email"
              type="text"
              ref={emailRef}
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="아이디"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="비밀번호"
            />
          </div>
          <div className="flex items-center">
            <input
              id="rememberId"
              type="checkbox"
              checked={rememberId}
              onChange={(e) => toggleRememberId(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="rememberId" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
              아이디 저장
            </label>
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600 space-y-2">
          <p>
            계정이 없으신가요?{' '}
            <button
              onClick={openSignup}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              회원가입
            </button>
          </p>
        </div>

        {/* '계정이 없으신가요?' 아래: 고객센터 안내 + 채팅문의 */}
        <div className="flex flex-col items-center" style={{ gap: '10px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ lineHeight: 1.3, alignSelf: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>고객센터</span>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#4f46e5' }}>02-381-2455</span>
            </div>
            {[['평일', '10:00~18:00'], ['점심시간', '12:00~13:30'], ['토요일', '10:00~14:00']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 700, color: '#334155' }}>
                <span style={{ display: 'inline-block', width: '68px', textAlign: 'justify', textAlignLast: 'justify' }}>{k}</span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          {/* 고객센터 아래 구분선 (대시보드와 동일) */}
          <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #e5e7eb', margin: '2px 0' }} />
          <img src={chatImg} alt="카톡문의" title="카카오톡 채팅 상담"
            onClick={() => { const url = 'http://pf.kakao.com/_wxjxcrX/chat'; if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url); else window.open(url, '_blank', 'noopener'); }}
            style={{ width: 'auto', maxWidth: '100%', display: 'block', cursor: 'pointer' }} />
        </div>
        </div>
        </div>

        {isSignupModalOpen && (
          <SignupPage onClose={() => setIsSignupModalOpen(false)} />
        )}
      </div>
    </>
  );
};

export default LoginPage;