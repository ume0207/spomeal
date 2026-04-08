import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  // iOS 26.4 beta でH3キャッシュが原因で接続できない問題を回避
  // alt-svcヘッダーを削除してHTTP/3へのアップグレードを防ぐ
  response.headers.delete('alt-svc')
  return response
}

export const config = {
  matcher: '/:path*',
}
