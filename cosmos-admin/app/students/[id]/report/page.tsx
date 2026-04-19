'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2, ArrowLeft, Printer } from 'lucide-react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface ReportData {
  student: { full_name: string; grade: number; batches?: { batch_name: string } }
  overallScore: number
  attendance: { present: number; absent: number; percentage: number }
  weakConcepts: { concept_name: string; subject: string; percentage_score: number }[]
  strongConcepts: { concept_name: string; subject: string; percentage_score: number }[]
}

export default function StudentReportPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReportData | null>(null)
  const [aiSummary, setAiSummary] = useState<string>('')
  const [generatingAI, setGeneratingAI] = useState(false)

  useEffect(() => {
    if (id) loadReportData()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadReportData() {
    setLoading(true)

    // 1. Student Info
    const { data: student } = await supabase
      .from('students')
      .select('full_name, grade, batches(batch_name), institutes(name)')
      .eq('id', id)
      .single()

    // 2. Attendance Stats
    const { data: logs } = await supabase
      .from('attendance_logs')
      .select('status')
      .eq('student_id', id)

    let present = 0, absent = 0
    if (logs) {
      present = logs.filter(l => l.status === 'present').length
      absent = logs.filter(l => l.status === 'absent').length
    }
    const totalDays = present + absent
    const attendPct = totalDays > 0 ? Math.round((present / totalDays) * 100) : 100

    // 3. Performance Stats
    const { data: perf } = await supabase
      .from('student_concept_performance')
      .select('*')
      .eq('student_id', id)

    let overallScore = 0
    let weak: any[] = []
    let strong: any[] = []

    if (perf && perf.length > 0) {
      const totalObtained = perf.reduce((s: number, p: any) => s + p.total_obtained, 0)
      const totalPossible = perf.reduce((s: number, p: any) => s + p.total_possible, 0)
      overallScore = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0

      weak = perf.filter(p => p.percentage_score < 60).sort((a,b) => a.percentage_score - b.percentage_score).slice(0, 3)
      strong = perf.filter(p => p.percentage_score > 85).sort((a,b) => b.percentage_score - a.percentage_score).slice(0, 3)
    }

    if (student) {
      setData({
        student: student as any,
        overallScore,
        attendance: { present, absent, percentage: attendPct },
        weakConcepts: weak,
        strongConcepts: strong
      })
    }

    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleGenerateAI = async () => {
    if (!data) return;
    setGeneratingAI(true);
    try {
        const res = await fetch('/api/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentName: data.student.full_name,
                overallScore: data.overallScore,
                attendance: data.attendance,
                strongConcepts: data.strongConcepts,
                weakConcepts: data.weakConcepts
            })
        });
        const result = await res.json();
        if (result.error) {
            alert('Failed to generate AI summary: ' + result.error);
        } else {
            setAiSummary(result.summary);
        }
    } catch (e: any) {
        alert('Network error during AI generation.');
    } finally {
        setGeneratingAI(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-cosmos-bg"><Loader2 size={28} className="animate-spin text-cosmos-primary" /></div>
  }

  if (!data) {
    return <div className="flex items-center justify-center min-h-screen bg-cosmos-bg text-cosmos-muted">No report data found.</div>
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-4 print:p-0 print:bg-white">
      
      {/* Navbar - hidden on print */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link href={`/students/${id}/performance`} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowLeft size={16} /> Back to Performance
        </Link>
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2 text-sm py-2">
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* Report Card Page */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none rounded-2xl print:rounded-none overflow-hidden border border-neutral-200 print:border-none p-8 md:p-12">
        
        {/* Header */}
        <div className="text-center border-b pb-8 mb-8 border-neutral-200">
          <h1 className="font-display text-3xl font-black text-neutral-900 tracking-tight">{(data.student as any).institutes?.name || 'COSMOS ACADEMY'}</h1>
          <p className="text-sm font-semibold text-cosmos-primary uppercase tracking-widest mt-1">Academic Report Card</p>
          <p className="text-xs text-neutral-400 mt-2">Generated on {new Date().toLocaleDateString('en-IN')}</p>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-2 gap-6 mb-8 bg-neutral-50 print:bg-neutral-50 p-6 rounded-xl border border-neutral-200/50">
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Student Name</p>
            <p className="font-display text-xl font-bold text-neutral-800 mt-0.5">{data.student.full_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-400 uppercase font-semibold">Grade</p>
              <p className="font-semibold text-neutral-800 mt-0.5">{data.student.grade}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400 uppercase font-semibold">Batch</p>
              <p className="font-semibold text-neutral-800 mt-0.5">{data.student.batches?.batch_name || 'General'}</p>
            </div>
          </div>
        </div>

        {/* AI Parent Summary Section */}
        <div className="mb-10 print:mb-6">
            <div className="flex items-center justify-between mb-3 print:hidden">
                <h3 className="font-display font-bold text-base text-neutral-800 flex items-center gap-2">
                    <span className="text-cosmos-blue">✨</span> AI Parent Summary
                </h3>
                <button onClick={handleGenerateAI} disabled={generatingAI} className="text-xs btn-primary py-1.5 px-3">
                    {generatingAI ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    {aiSummary ? 'Regenerate Summary' : 'Generate Summary'}
                </button>
            </div>
            
            {aiSummary ? (
                <div className="bg-cosmos-blue/5 border border-cosmos-blue/20 rounded-xl p-5">
                    <p className="text-sm text-neutral-700 leading-relaxed italic">{aiSummary}</p>
                </div>
            ) : (
                <div className="bg-neutral-50 border border-neutral-200 border-dashed rounded-xl p-5 text-center print:hidden">
                    <p className="text-xs text-neutral-400">Click &quot;Generate Summary&quot; to use AI to write a personalized note based on these metrics.</p>
                </div>
            )}
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          
          {/* Overall Performance */}
          <div className="border border-neutral-200 rounded-xl p-6 text-center">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Overall Score</p>
            <p className="text-5xl font-black text-cosmos-primary mb-1">{data.overallScore}%</p>
            <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden mt-3 max-w-xs mx-auto">
              <div className="h-full bg-cosmos-primary" style={{ width: `${data.overallScore}%` }} />
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="border border-neutral-200 rounded-xl p-6 text-center">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Attendance</p>
            <p className="text-5xl font-black text-emerald-600 mb-1">{data.attendance.percentage}%</p>
            <p className="text-xs text-neutral-400 mt-2">
              Present {data.attendance.present} days / Absent {data.attendance.absent} days
            </p>
          </div>

        </div>

        {/* Concepts Breakdown */}
        <div className="space-y-8">
          
          {/* Areas of Strength */}
          {data.strongConcepts.length > 0 && (
            <div>
              <h3 className="font-display font-bold text-base text-neutral-800 mb-4 flex items-center gap-2">
                <span className="text-emerald-500">🏆</span> Strong Concepts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.strongConcepts.map((c, i) => (
                  <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                    <p className="font-bold text-xs text-emerald-700">{c.concept_name}</p>
                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{c.subject}</p>
                    <p className="text-base font-black text-emerald-700 mt-2">{c.percentage_score}% <span className="text-xs font-normal">Score</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas Needing Focus */}
          {data.weakConcepts.length > 0 && (
            <div>
              <h3 className="font-display font-bold text-base text-neutral-800 mb-4 flex items-center gap-2">
                <span className="text-amber-500">🎯</span> Areas for Improvement
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.weakConcepts.map((c, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                    <p className="font-bold text-xs text-amber-700">{c.concept_name}</p>
                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">{c.subject}</p>
                    <p className="text-base font-black text-amber-700 mt-2">{c.percentage_score}% <span className="text-xs font-normal">Score</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Teacher Feedback Footer */}
        <div className="mt-16 border-t pt-8 border-neutral-200">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-10">Signatures & Approvals</p>
          <div className="flex justify-between items-end">
            <div className="w-48 text-center">
              <div className="border-b border-neutral-400 h-10 mb-2"></div>
              <p className="text-xs text-neutral-500 font-medium">Head Instructor</p>
            </div>
            <div className="w-48 text-center">
              <div className="border-b border-neutral-400 h-10 mb-2"></div>
              <p className="text-xs text-neutral-500 font-medium">Parent Sign</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
