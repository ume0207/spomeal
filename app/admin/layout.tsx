import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Admin top nav */}
      <nav className="bg-[#1a1a1a] text-white px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-base font-black">
              スポ<span className="text-[#22c55e]">ミル</span>
              <span className="text-xs text-gray-400 ml-2 font-normal">Admin</span>
            </Link>
            <div className="flex items-center gap-1">
              {[
                { href: '/admin', label: 'ダッシュボード' },
                { href: '/admin/members', label: 'メンバー' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            アプリに戻る
          </Link>
        </div>
      </nav>
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
