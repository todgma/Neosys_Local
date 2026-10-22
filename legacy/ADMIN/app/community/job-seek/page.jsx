'use client';
import CommunityBoardTable from '../../../components/CommunityBoardTable';

export default function Page() {
  return <CommunityBoardTable board={{ label: '구직게시판', type: 'job', kind: '구직' }} />;
}
