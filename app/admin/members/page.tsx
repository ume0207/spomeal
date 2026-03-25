'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Member {
  id: string
  name: string
  email: string
  plan: string
  status: 'active' | 'trial' | 'free' | 'cancelled'
  joinedAt: string
  lastActive: string
  revenue: number
}

const demoMembers: Member[] = [
  { id: '1', name: '山田 太郎', email: 'yamada@example.com', plan: 'スタンダード', status: 'active', joinedAt: '2025-01-15', lastActive: '今日', revenue: 1980 },
  { id: '2', name: '佐藤 花子', email: 'sato@example.com', plan: 'プレミアム', status: 'active', joinedAt: '2024-12-01', lastActive: '今日', revenue: 3980 },
  { id: '3', name: '鈴木 一郎', email: 'suzuki@example.com', plan: 'ライト', status: 'trial', joinedAt: '2025-03-20', lastActive: '昨日', revenue: 0 },
  { id: '4', name: '田中 美咲', email: 'tanaka@example.com', plan: 'スタンダード', status: 'active', joinedAt: '2025-02-10', lastActive: '2日前', revenue: 1980 },
  { id: '5', name: '伊藤 健司', email: 'ito@example.com', plan: 'フリー', status: 'free', joinedAt: '2025-03-18', lastActive: '3日前', revenue: 0 },
  { id: '6', name: '渡辺 さくら', email: 'watanabe@example.com', plan: 'プレミアム', status: 'active', joinedAt: '2024-11-20', lastActive: '今日', revenue: 3980 },
  { id: '7', name: '中村 拓哉', email: 'nakamura@example.com', plan: 'スタンダード', status: 'cancelled', joinedAt: '2024-10-05', lastActive: '1週間前', revenue: 0 },
  { id: '8', name: '小林 葵', email: 'kobayashi@example.com', plan: 'ライト', status: 'active', joinedAt: '2025-01-28', lastActive: '今日', revenue: 980 },
]

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: '有料', className: 'bg-green-100 text-green-700' },
  trial: { label: 'トライアル', className: 'bg-blue-100 text-blue-700' },
  free: { label: '無料', className: 'bg-gray-100 text-gray-500' },
  cancelled: { label: '解約', className: 'bg-red-100 text-red-600' },
}

export default function MembersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const filtered = demoMembers.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">会員管理</h1>
          <p className="text-sm text-gray-500 mt-1">全 {demoMembers.length} 名</p>
        </div>
        <Button variant="primary" size="sm">
          CSVエクスポート
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="名前・メールで検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              }
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'すべて' },
              { value: 'active', label: '有料' },
              { value: 'trial', label: 'トライアル' },
              { value: 'free', label: '無料' },
              { value: 'cancelled', label: '解約' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === opt.value
                    ? 'bg-[#22c55e] text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Members table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left font-semibold text-gray-400 px-4 py-3">会員</th>
                <th className="text-left font-semibold text-gray-400 px-4 py-3">プラン</th>
                <th className="text-left font-semibold text-gray-400 px-4 py-3">ステータス</th>
                <th className="text-left font-semibold text-gray-400 px-4 py-3">登録日</th>
                <th className="text-left font-semibold text-gray-400 px-4 py-3">最終ログイン</th>
                <th className="text-right font-semibold text-gray-400 px-4 py-3">月収益</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{member.name}</div>
                        <div className="text-gray-400 text-[10px]">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{member.plan}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig[member.status].className}`}>
                      {statusConfig[member.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{member.joinedAt}</td>
                  <td className="px-4 py-3 text-gray-400">{member.lastActive}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {member.revenue > 0 ? `¥${member.revenue.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedMember(member)}
                      className="text-[#22c55e] font-semibold hover:text-[#16a34a] text-[10px]"
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              会員が見つかりませんでした
            </div>
          )}
        </div>
      </Card>

      {/* Member detail modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedMember(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-[20px] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">会員詳細</h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-white text-base font-bold">
                {selectedMember.name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-gray-900">{selectedMember.name}</div>
                <div className="text-xs text-gray-400">{selectedMember.email}</div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { label: 'プラン', value: selectedMember.plan },
                { label: 'ステータス', value: statusConfig[selectedMember.status].label },
                { label: '登録日', value: selectedMember.joinedAt },
                { label: '最終ログイン', value: selectedMember.lastActive },
                { label: '月収益', value: selectedMember.revenue > 0 ? `¥${selectedMember.revenue.toLocaleString()}` : '無料' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <span className="text-xs font-semibold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" fullWidth size="sm">
                メール送信
              </Button>
              <Button variant="danger" size="sm" className="flex-1">
                アカウント停止
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
