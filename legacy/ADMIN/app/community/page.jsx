import { redirect } from 'next/navigation';

// /community 진입 시 첫 게시판으로 이동 (하위 메뉴는 개별 페이지)
export default function CommunityIndex() {
  redirect('/community/job-offer');
}
