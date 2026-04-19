'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Loader2, ArrowLeft, Target, Zap, Activity, FileText } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface ConceptPerformance {
  micro_tag_id: string
  subject: string
  chapter: string
  concept_name: string
  percentage_score: number
  total_obtained: number
  total_possible: number
  questions_attempted: number
}

interface GroupedPerformance {
  subject: string
  chapters: {
    chapter: string
    concepts: ConceptPerformance[]
  }[]
}

export default function StudentPerformancePage() {
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [grouped, setGrouped] = useState<GroupedPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState('')
  const [overallScore, setOverallScore] = useState(0)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadPerformance()
  }, [id])

  async function loadPerformance() {
    setLoading(true)

    // 1. Fetch Student details
    const { data: student } = await supabase
      .from('students')
      .select('full_name')
      .eq('id', id)
      .single()

    if (student) setStudentName(student.full_name)

    // 2. Fetch Overall performance view data 
    const { data: perf } = await supabase
      .from('student_concept_performance')
      .select('*')
      .eq('student_id', id)
      .order('subject')

    if (perf && perf.length > 0) {
      const totalObtained = perf.reduce((s: number, p: any) => s + p.total_obtained, 0)
      const totalPossible = perf.reduce((s: number, p: any) => s + p.total_possible, 0)
      setOverallScore(totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0)

      const subjectMap: { [s: string]: { [c: string]: ConceptPerformance[] } } = {}
      for (const p of perf) {
        if (!subjectMap[p.subject]) subjectMap[p.subject] = {}
        if (!subjectMap[p.subject][p.chapter]) subjectMap[p.subject][p.chapter] = []
        subjectMap[p.subject][p.chapter].push(p)
      }

      const result: GroupedPerformance[] = Object.entries(subjectMap).map(([subject, chapters]) => ({
        subject,
        chapters: Object.entries(chapters).map(([chapter, concepts]) => ({ chapter, concepts })),
      }))

      setGrouped(result)
      if (result.length > 0) setSelectedSubject(result[0].subject)
    }

    setLoading(false)
  }

  const getHeatColor = (score: number) => {
    if (score >= 85) return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Excellent' }
    if (score >= 70) return { bg: 'bg-teal-500/10', text: 'text-teal-500', label: 'Strong' }
    if (score >= 55) return { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Good' }
    if (score >= 40) return { bg: 'bg-orange-500/10', text: 'text-orange-500', label: 'Needs Work' }
    if (score >= 25) return { bg: 'bg-rose-500/10', text: 'text-rose-500', label: 'Weak' }
    return { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Critical' }
  }

  const subjects = grouped.map(g => g.subject)
  const activeGroup = grouped.find(g => g.subject === selectedSubject)
  const overallColor = getHeatColor(overallScore)

  return (
    <div className="flex min-h-screen bg-cosmos-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
        
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/students" className="p-2 rounded-lg hover:bg-cosmos-surface text-cosmos-muted">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold text-cosmos-text">Student Performance</h1>
              <p className="text-cosmos-muted text-sm mt-1">Viewing micro-concept mastery for {studentName || '...'}</p>
            </div>
          </div>

          <Link href={`/students/${id}/report`} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
            <FileText size={16} /> Generate Report Card
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-cosmos-primary" /></div>
        ) : grouped.length === 0 ? (
          <div className="cosmos-card py-16 text-center text-cosmos-muted">No test performance data available for this student yet.</div>
        ) : (
          <div>
            {/* Overall Score Card */}
            <div className={`cosmos-card mb-8 border transition-all ${overallColor.bg} border-${overallColor.text.replace('text-', '')}/30`}>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <h2 className={`font-display text-5xl font-black ${overallColor.text}`}>{overallScore}%</h2>
                  <span className={`badge-blue mt-1 inline-block bg-white/10 ${overallColor.text}`}>{overallColor.label}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 text-cosmos-muted text-sm">
                    <Target size={14} /> Overall Academy Score
                  </div>
                  <div className="w-full h-2 rounded-full bg-cosmos-border/40 overflow-hidden">
                    <div className={`h-full ${overallColor.text.replace('text-', 'bg-')}`} style={{ width: `${overallScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSubject(s)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                    selectedSubject === s 
                      ? 'bg-cosmos-primary/20 border-cosmos-primary text-cosmos-primary' 
                      : 'bg-cosmos-card border-cosmos-border hover:bg-cosmos-surface text-cosmos-muted'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Chapter Heatgrids */}
            {activeGroup && activeGroup.chapters.map(({ chapter, concepts }) => (
              <div key={chapter} className="mb-8">
                <h3 className="font-display font-bold text-base text-cosmos-text mb-4">{chapter}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {concepts.map(c => {
                    const heat = getHeatColor(c.percentage_score || 0)
                    return (
                      <div key={c.micro_tag_id} className={`p-4 rounded-xl border ${heat.bg} border-${heat.text.replace('text-', '')}/30`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-display font-bold text-2xl ${heat.text}`}>{Math.round(c.percentage_score)}%</span>
                          <Zap className={heat.text} size={14} opacity={0.6} />
                        </div>
                        <h4 className="font-semibold text-xs text-cosmos-text line-clamp-1 mb-1">{c.concept_name}</h4>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${heat.text}`}>{heat.label}</span>
                        <div className="flex justify-between items-center mt-3 text-[10px] text-cosmos-muted">
                          <span>{c.questions_attempted} Qs</span>
                          <span>{c.total_obtained}/{c.total_possible} pts</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

          </div>
        )}

      </main>
    </div>
  )
}
