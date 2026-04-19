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

import { useGlobalContext } from '@/lib/GlobalContext'

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalBatches: 0, testsThisMonth: 0, attendanceToday: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { selectedInstituteId, role } = useGlobalContext()

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Handle Super Admin Dashboard
      if (role === 'super_admin') {
        const { data: metrics } = await supabase.rpc('get_institute_metrics')
        if (metrics) {
          const filtered = selectedInstituteId === 'all' 
            ? metrics 
            : metrics.filter((m: any) => m.institute_id === selectedInstituteId);
            
          const totalS = filtered.reduce((acc: number, curr: any) => acc + Number(curr.student_count), 0)
          const totalB = filtered.reduce((acc: number, curr: any) => acc + Number(curr.batch_count), 0)
          setStats({ totalStudents: totalS, totalBatches: totalB, testsThisMonth: 0, attendanceToday: 0 })
        }
        setLoading(false)
        return
      }

      // Handle Tenant Admin/Teacher Dashboard
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      
      let sQuery = supabase.from('students').select('id', { count: 'exact' }).eq('is_active', true)
      let bQuery = supabase.from('batches').select('id', { count: 'exact' }).eq('is_active', true)
      let tQuery = supabase.from('tests').select('id', { count: 'exact' }).gte('test_date', monthStart)
      let aQuery = supabase.from('attendance_logs').select('id', { count: 'exact' }).eq('log_date', today)

      if (selectedInstituteId !== 'all') {
        sQuery = sQuery.eq('institute_id', selectedInstituteId)
        bQuery = bQuery.eq('institute_id', selectedInstituteId)
        tQuery = tQuery.eq('institute_id', selectedInstituteId)
        
        // Fetch student IDs for this institute to filter attendance
        const { data: sIds } = await supabase.from('students').select('id').eq('institute_id', selectedInstituteId)
        const ids = sIds?.map(s => s.id) || []
        if (ids.length > 0) {
            aQuery = aQuery.in('student_id', ids)
        } else {
            // No students, so no attendance
            aQuery = aQuery.eq('student_id', '00000000-0000-0000-0000-000000000000') 
        }
      }

      const [a, b, c, d] = await Promise.all([
        sQuery,
        bQuery,
        tQuery,
        aQuery,
      ])
      setStats({ totalStudents: a.count||0, totalBatches: b.count||0, testsThisMonth: c.count||0, attendanceToday: d.count||0 })
      setLoading(false)
    }
    load()
  }, [selectedInstituteId, role]) // eslint-disable-line react-hooks/exhaustive-deps

  const statCards = [
    { label: 'Active Students',   value: stats.totalStudents,   icon: Users,        primary: true  },
    { label: 'Active Batches',    value: stats.totalBatches,    icon: BookOpen,     color: 'text-cosmos-cyan',   bg: 'bg-cosmos-cyan/10',   border: 'border-cosmos-cyan/20'   },
    { label: 'Tests This Month',  value: stats.testsThisMonth,  icon: ClipboardList,color: 'text-cosmos-orange', bg: 'bg-cosmos-orange/10', border: 'border-cosmos-orange/20' },
    { label: 'Attendance Today',  value: stats.attendanceToday, icon: CalendarCheck,color: 'text-cosmos-green',  bg: 'bg-cosmos-green/10',  border: 'border-cosmos-green/20'  },
  ]

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-cosmos-primary">Dashboard</h1>
          <p className="text-cosmos-muted text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

        {role !== 'super_admin' && (
          <>
            {/* Quick Actions */}
            <div className="cosmos-card mb-6">
              <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-cosmos-muted mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          </>
        )}
      </main>
    </div>
  )
}
