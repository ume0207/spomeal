import BottomNav from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[640px] mx-auto min-h-screen pb-20">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
