import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'컷노트 — 영상 레퍼런스 라이브러리',description:'기억해두고 싶은 장면을 모아 색감, 구도, 효과 태그로 다시 찾아보세요.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
