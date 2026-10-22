'use client';
import CommunityBoardTable from '../../../components/CommunityBoardTable';

export default function Page() {
  // label(표시)은 '사무소 양도', tab(저장 카테고리 값)은 기존 유지
  return <CommunityBoardTable board={{ label: '사무소 양도', type: 'post', tab: '사무소 매수/매도' }} />;
}
