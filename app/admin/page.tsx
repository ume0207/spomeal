import Link from 'next/link'
import Card from '@/components/ui/Card'

export default function AdminDashboardPage() {
  const stats = [
    { label: '総会員数', value: '1,284', change: '+12', period: '今月', icon: '👥', color: '#3b82f6' },
    { label: '有料会員', value: '486', change: '+8', period: '今月', icon: '💎', color: '#22c55e' },
    { label: 'MRR', value: '¥742,680', change: '+¥24,500', period: '先月比', icon: '💰', color: '#f59e0b' },
    { label: '解約率', value: '2.1%', change: '-0.3%', period: '先月比', icon: '📉', color: '#ef4444' },
  ]

  const recentMembers = [
    { name: '山田 太郎', email: 'yamada@example.com', plan: 'スタンダード', joined: '3時間前', status: 'active' },
    { name: '佐藤 花子', email: 'sato@example.com', plan: 'プレミアム', joined: '1日前', status: 'active' },
    { name: '鈴木 一郎', email: 'suzuki@example.com', plan: 'ライト', joined: '2日前', status: 'trial' },
    { name: '田中 美咲', email: 'tanaka@example.com', plan: 'スタンダード', joined: '3日前', status: 'active' },
    { name: '伊藤 健司', email: 'ito@example.com', plan: 'フリー', joined: '5日前', status: 'free' },
  ]

  const planDistribution = [
    { plan: 'プレミアム', count: 98, percent: 20, color: '#f59e0b' },
    { plan: 'スタンダード', count: 245, percent: 50, color: '#22c55e' },
    { plan: 'ライト', count: 143, percent: 30, color: '#3b82f6' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">管理ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">スポミル 管理者パネル</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gray-50">
                {stat.icon}
              </div>
              <div
                className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                  stat.change.startsWith('+') && stat.label !== '解約率'
                    ? 'bg-green-50 text-green-700'
                    : stat.change.startsWith('-') && stat.label === '解約率'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {stat.change}
              </div>
            </div>
            <div className="text-2xl font-black text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
            <div className="text-[10px] text-gray-300">{stat.period}</div>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Plan distribution */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">プラン分布</h2>
            <Link href="/admin/members" className="text-xs text-[#22c55e] font-medium">詳細 →</Link>
          </div>
          <div className="space-y-3">
            {planDistribution.map((item) => (
              <div key={item.plan}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-700">{item.plan}</span>
                  <span className="text-gray-400">{item.count}人 ({item.percent}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly revenue chart placeholder */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-800">月次MRR</h2>
            <span className="text-xs text-gray-400">過去6ヶ月</span>
          </div>
          <div className="flex gap-1.5 items-end h-24">
            {[420000, 510000, 580000, 620000, 695000, 742000].map((val, i) => {
              const months = ['10月', '11月', '12月', '1月', '2月', '3月']
              const maxVal = 800000
              const height = (val / maxVal) * 80
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: `${height}px`,
                      backgroundColor: i === 5 ? '#22c55e' : '#dcfce7',
                    }}
                  />
                  <span className="text-[9px] text-gray-400">{months[i]}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Recent members */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-800">最近の登録会員</h2>
          <Link href="/admin/members" className="text-xs text-[#22c55e] font-medium">すべて表示 →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-semibold text-gray-400 pb-2">名前</th>
                <th className="text-left font-semibold text-gray-400 pb-2">プラン</th>
                <th className="text-left font-semibold text-gray-400 pb-2">登録</th>
                <th className="text-left font-semibold text-gray-400 pb-2">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentMembers.map((member, i) => (
                <tr key={i}>
                  <td className="py-2.5">
                    <div className="font-semibold text-gray-800">{member.name}</div>
                    <div className="text-gray-400 text-[10px]">{member.email}</div>
                  </td>
                  <td className="py-2.5 text-gray-600">{member.plan}</td>
                  <td className="py-2.5 text-gray-400">{member.joined}</td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        member.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : member.status === 'trial'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {member.status === 'active' ? '有料' : member.status === 'trial' ? 'トライアル' : '無料'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
