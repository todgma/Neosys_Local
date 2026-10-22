import { WindowConfig } from '../types';

class WindowManager {
  private openWindows: Map<string, WindowConfig> = new Map();

  async openWindow(config: WindowConfig): Promise<void> {
    try {
      // 이미 열린 창이 있으면 포커스만
      if (this.openWindows.has(config.id)) {
        // 창 포커스 로직 (필요시 구현)
        return;
      }

      // Electron API 사용
      if (window.electronAPI) {
        await window.electronAPI.createWindow(
          config.url.replace('/', ''),
          config.title,
          {
            width: config.width,
            height: config.height,
            resizable: config.resizable,
          }
        );
      } else {
        // 웹에서는 새 탭으로 열기
        window.open(config.url, '_blank');
      }

      this.openWindows.set(config.id, config);
    } catch (error) {
      console.error('Failed to open window:', error);
      throw error;
    }
  }

  closeWindow(windowId: string): void {
    this.openWindows.delete(windowId);
  }

  isWindowOpen(windowId: string): boolean {
    return this.openWindows.has(windowId);
  }

  getOpenWindows(): WindowConfig[] {
    return Array.from(this.openWindows.values());
  }

  async openPropertyWindow(propertyId: string): Promise<void> {
    const config: WindowConfig = {
      id: `property-${propertyId}`,
      title: `물건 상세 - ${propertyId}`,
      url: `/properties/${propertyId}`,
      width: 1000,
      height: 700,
      resizable: true,
    };

    await this.openWindow(config);
  }

  async openContractWindow(contractId: string): Promise<void> {
    const config: WindowConfig = {
      id: `contract-${contractId}`,
      title: `계약서 - ${contractId}`,
      url: `/contracts/${contractId}`,
      width: 900,
      height: 800,
      resizable: true,
    };

    await this.openWindow(config);
  }

  async openAgentWindow(agentId: string): Promise<void> {
    const config: WindowConfig = {
      id: `agent-${agentId}`,
      title: `직원 정보 - ${agentId}`,
      url: `/agents/${agentId}`,
      width: 800,
      height: 600,
      resizable: true,
    };

    await this.openWindow(config);
  }
}

export const windowManager = new WindowManager();