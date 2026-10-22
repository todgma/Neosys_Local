import React, { useState } from 'react';
import { Bell, Search, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Button from '../ui/Button';

const TopBar = () => {
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const mockNotifications = [
    { id: 1, title: '새로운 계약서가 등록되었습니다', time: '5분 전', unread: true },
    { id: 2, title: '물건 문의가 도착했습니다', time: '1시간 전', unread: true },
    { id: 3, title: '시스템 업데이트가 완료되었습니다', time: '2시간 전', unread: false },
  ];

  const unreadCount = mockNotifications.filter(n => n.unread).length;

  return null;
};

export default TopBar;