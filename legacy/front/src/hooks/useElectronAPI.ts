import { useCallback } from 'react';
import { WindowConfig } from '../types';

// Electron API 타입 정의
declare global {
  interface Window {
    electronAPI: {
      createWindow: (route: string, title: string, options?: any) => Promise<string>;
      closeWindow: (windowId: string) => Promise<boolean>;
      showMessageBox: (options: any) => Promise<any>;
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
    };
  }
}

export const useElectronAPI = () => {
  const createNewWindow = useCallback(async (config: WindowConfig) => {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.createWindow(
          config.url.replace('/', ''),
          config.title,
          {
            width: config.width,
            height: config.height,
            resizable: config.resizable,
          }
        );
      }
      // 웹에서는 새 탭으로 열기
      window.open(config.url, '_blank');
      return 'web-window';
    } catch (error) {
      console.error('Failed to create new window:', error);
      throw error;
    }
  }, []);

  const closeWindow = useCallback(async (windowId: string) => {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.closeWindow(windowId);
      }
      return false;
    } catch (error) {
      console.error('Failed to close window:', error);
      return false;
    }
  }, []);

  const showMessageBox = useCallback(async (options: {
    type?: 'info' | 'warning' | 'error' | 'question';
    title?: string;
    message: string;
    detail?: string;
    buttons?: string[];
  }) => {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.showMessageBox(options);
      }
      // 웹에서는 기본 alert/confirm 사용
      if (options.type === 'question' && options.buttons) {
        return { response: confirm(options.message) ? 0 : 1 };
      }
      alert(options.message);
      return { response: 0 };
    } catch (error) {
      console.error('Failed to show message box:', error);
      throw error;
    }
  }, []);

  const showSaveDialog = useCallback(async (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => {
    try {
      if (window.electronAPI) {
        return await window.electronAPI.showSaveDialog(options);
      }
      // 웹에서는 다운로드 링크 생성
      return { canceled: false, filePath: 'download.txt' };
    } catch (error) {
      console.error('Failed to show save dialog:', error);
      throw error;
    }
  }, []);

  const isElectron = useCallback(() => {
    return typeof window !== 'undefined' && window.electronAPI;
  }, []);

  const getPlatform = useCallback(() => {
    return window.electronAPI?.platform || 'web';
  }, []);

  return {
    createNewWindow,
    closeWindow,
    showMessageBox,
    showSaveDialog,
    isElectron,
    getPlatform,
  };
};