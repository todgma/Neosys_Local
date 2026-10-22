'use client';
import CommunityBoardTable from '../../../components/CommunityBoardTable';

export default function Page() {
  return <CommunityBoardTable board={{ label: '구인게시판', type: 'job', kind: '구인' }} />;
}
