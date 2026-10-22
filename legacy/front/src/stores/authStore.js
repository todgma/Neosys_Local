import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import { officeService } from '../services/officeService';
import { realestaterService } from '../services/realestaterService';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      office: null,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await authService.login(email, password);

          // 기본 로그인 정보 저장
          set({
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            isLoading: false,
          });

          // 로그인 성공 후 중개인 상세 정보 조회
          try {
            const rtNo = response.data.user.rtNo;
            if (rtNo) {
              const realestaterResponse = await realestaterService.getDetail(rtNo);
              if (realestaterResponse.success && realestaterResponse.data) {
                // 중개인 상세 정보로 user 업데이트
                //  ※ 상세 조회에는 멤버십 계산이 없어 hasMembership=false로 내려옴 → 로그인 값(true) 보존
                set({
                  user: {
                    ...response.data.user,
                    ...realestaterResponse.data,
                    hasMembership: response.data.user.hasMembership,
                    hasEntryFee: response.data.user.hasEntryFee, // 로그인 값(사무소 가입비) 보존
                    referralCode: response.data.user.referralCode ?? realestaterResponse.data.referralCode,
                  },
                });
              }
            }
          } catch (error) {
            console.log('중개인 상세 정보 조회 실패:', error);
          }

          // 사무실 정보 조회
          try {
            const officeResponse = await officeService.getOfficeByUser(response.data.user.userId);
            if (officeResponse.success && officeResponse.data) {
              set({ office: officeResponse.data });
            }
          } catch (error) {
            console.log('사무실 정보 조회 실패:', error);
            set({ office: null });
          }

          return true;
        } catch (error) {
          console.error('Login error:', error);
          // apiHandler에서 이미 에러 메시지를 표시하므로 중복 alert 제거
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            office: null,
          });
          // 자동 로그인 설정도 초기화
          localStorage.removeItem('rememberMe');
        }
      },

      updateUser: (userData) => {
        set({
          user: {
            ...get().user,
            ...userData,
          },
        });
      },

      updateOffice: (officeData) => {
        set({ office: officeData });
      },

      initializeAuth: () => {
        const state = get();
        if (!state.isAuthenticated) {
          set({ isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // office는 캐시하지 않고 매번 조회
      }),
    }
  )
);