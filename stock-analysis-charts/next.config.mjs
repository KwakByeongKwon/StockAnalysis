/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['node:sqlite'],
  // 하단 Next.js (N) 개발용 툴바 아이콘 완전 제거
  devIndicators: false,
  // 스마트폰 및 로컬 Wi-Fi 기기에서 자바스크립트 번들 차단 방지
  allowedDevOrigins: [
    '192.168.45.95',
    '192.168.*.*',
    'localhost:3000',
    '127.0.0.1',
    '0.0.0.0',
  ],
}

export default nextConfig
