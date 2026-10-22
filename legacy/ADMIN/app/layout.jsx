import './globals.css';
import Shell from '../components/Shell';

export const metadata = { title: '네오시스 관리자', description: '관리자 웹' };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
