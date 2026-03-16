'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Users, BookOpen, ClipboardList, CalendarCheck } from 'lucide-react'

interface Stats {
  totalStudents: number
  totalBatches: number
  testsThisMonth: number
  attendanceToday: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalBatches: 0, testsThisMonth: 0, attendanceToday: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const [a, b, c, d] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('batches').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('tests').select('id', { count: 'exact' }).gte('test_date', monthStart),
        supabase.from('attendance_logs').select('id', { count: 'exact' }).eq('log_date', today),
      ])
      setStats({ totalStudents: a.count||0, totalBatches: b.count||0, testsThisMonth: c.count||0, attendanceToday: d.count||0 })
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Active Students',   value: stats.totalStudents,   icon: Users,        primary: true  },
    { label: 'Active Batches',    value: stats.totalBatches,    icon: BookOpen,     color: 'text-cosmos-cyan',   bg: 'bg-cosmos-cyan/10',   border: 'border-cosmos-cyan/20'   },
    { label: 'Tests This Month',  value: stats.testsThisMonth,  icon: ClipboardList,color: 'text-cosmos-orange', bg: 'bg-cosmos-orange/10', border: 'border-cosmos-orange/20' },
    { label: 'Attendance Today',  value: stats.attendanceToday, icon: CalendarCheck,color: 'text-cosmos-green',  bg: 'bg-cosmos-green/10',  border: 'border-cosmos-green/20'  },
  ]

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-cosmos-primary">Dashboard</h1>
          <p className="text-cosmos-muted text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {statCards.map(({ label, value, icon: Icon, primary, color, bg, border }) => (
            <div key={label} className={`cosmos-card ${primary ? 'stat-primary' : `border ${border} ${bg}`}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-cosmos-muted text-xs font-medium uppercase tracking-wider">{label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${primary ? 'bg-cosmos-primary/10' : bg}`}>
                  <Icon size={15} className={primary ? 'text-cosmos-primary' : color} />
                </div>
              </div>
              <div className={`text-3xl font-display font-bold ${primary ? 'text-cosmos-primary' : color}`}>
                {loading ? '—' : value}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="cosmos-card mb-6">
          <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-cosmos-muted mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            <a href="/marks-entry" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-cosmos-primary/5 border border-cosmos-primary/15 hover:bg-cosmos-primary/10 transition-colors cursor-pointer">
              <ClipboardList size={20} className="text-cosmos-primary" />
              <span className="text-xs font-medium text-cosmos-primary">Enter Marks</span>
            </a>
            <a href="/attendance" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-cosmos-green/10 border border-cosmos-green/20 hover:bg-cosmos-green/20 transition-colors cursor-pointer">
              <CalendarCheck size={20} className="text-cosmos-green" />
              <span className="text-xs font-medium text-cosmos-green">Mark Attendance</span>
            </a>
            <a href="/students" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-cosmos-orange/10 border border-cosmos-orange/20 hover:bg-cosmos-orange/20 transition-colors cursor-pointer">
              <Users size={20} className="text-cosmos-orange" />
              <span className="text-xs font-medium text-cosmos-orange">Add Student</span>
            </a>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="cosmos-card border-cosmos-primary/10 bg-cosmos-primary/3">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cosmos-primary mt-1.5 shrink-0" />
            <div>
              <p className="text-cosmos-primary text-xs font-semibold mb-1">Keyboard Shortcuts — Marks Entry</p>
              <div className="flex flex-wrap gap-2 text-xs text-cosmos-muted">
                <span><kbd>Tab</kbd> Next field</span>
                <span><kbd>Shift+Tab</kbd> Previous</span>
                <span><kbd>Enter</kbd> Save row</span>
                <span><kbd>Ctrl+S</kbd> Save all</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
