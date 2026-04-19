// app/marks-entry/page.tsx
// THE CORE PAGE — keyboard-first marks entry for test questions
'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient, type Batch, type Test, type TestQuestion, type Student } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import Sidebar from '@/components/Sidebar'
import { Plus, Save, ChevronDown, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface ScoreRow {
  student_id: string
  student_name: string
  scores: { [question_id: string]: 'ungraded' | 'correct' | 'incorrect' }
}


import { useGlobalContext } from '@/lib/GlobalContext'

export default function MarksEntryPage() {
  const supabase = createClient()
  const { selectedInstituteId, role } = useGlobalContext()

  const [batches, setBatches] = useState<Batch[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([])

  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedTest, setSelectedTest] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Track which cells are saved vs dirty
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set())

  const gridRef = useRef<HTMLTableElement>(null)

  // Load batches on mount / context change
  useEffect(() => {
    let query = supabase.from('batches').select('*').eq('is_active', true).order('grade')
    if (selectedInstituteId !== 'all') {
      query = query.eq('institute_id', selectedInstituteId)
    }

    query.then(({ data }) => {
      if (data) {
        setBatches(data)
        if (selectedBatch && !data.find(b => b.id === selectedBatch)) {
          setSelectedBatch('')
          setSelectedTest('')
          setScoreRows([])
        }
      }
    })
  }, [selectedInstituteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load tests when batch selected
  useEffect(() => {
    if (!selectedBatch) return
    supabase.from('tests').select('*').eq('batch_id', selectedBatch).order('test_date', { ascending: false }).then(({ data }) => {
      if (data) setTests(data)
    })
  }, [selectedBatch])

  // Load questions and students when test selected
  useEffect(() => {
    if (!selectedTest || !selectedBatch) return
    setLoadingStudents(true)

    // Step 1: fetch questions + students in parallel
    Promise.all([
      supabase.from('test_questions').select('*, micro_tags(*)').eq('test_id', selectedTest).order('question_number'),
      supabase.from('students').select('*').eq('batch_id', selectedBatch).eq('is_active', true).order('full_name'),
    ]).then(async ([qRes, sRes]) => {
      const qs = qRes.data || []
      const ss = sRes.data || []

      // Step 2: fetch existing scores using the actual question ID array
      const questionIds = qs.map(q => q.id)
      let existingScores: any[] = []
      if (questionIds.length > 0) {
        const { data: scoresData } = await supabase
          .from('student_scores').select('*').in('question_id', questionIds)
        existingScores = scoresData || []
      }

      setQuestions(qs)
      setStudents(ss)

      const rows: ScoreRow[] = ss.map(student => {
        const scores: { [qid: string]: 'ungraded' | 'correct' | 'incorrect' } = {}
        qs.forEach(q => {
          const existing = existingScores.find(s => s.student_id === student.id && s.question_id === q.id)
          scores[q.id] = existing 
            ? (existing.is_correct ? 'correct' : 'incorrect') 
            : 'ungraded'
        })
        return { student_id: student.id, student_name: student.full_name, scores }
      })


      setScoreRows(rows)
      setLoadingStudents(false)
    })
  }, [selectedTest])

  // Handle cell change
  const toggleScoreStatus = useCallback((studentIdx: number, questionId: string) => {
    setScoreRows(prev => {
      const next = [...prev]
      const current = next[studentIdx].scores[questionId] || 'ungraded'
      const nextState: 'ungraded' | 'correct' | 'incorrect' = 
        current === 'ungraded' ? 'correct' :
        current === 'correct' ? 'incorrect' : 'ungraded'
      
      next[studentIdx] = { ...next[studentIdx], scores: { ...next[studentIdx].scores, [questionId]: nextState } }
      return next
    })
    setSavedCells(prev => {
      const next = new Set(prev)
      next.delete(`${studentIdx}-${questionId}`)
      return next
    })
  }, [])


  // Keyboard navigation — Tab moves right, then down
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      // Move to next cell (right first, then next row)
      const nextCol = colIdx + 1
      const nextRow = nextCol >= questions.length ? rowIdx + 1 : rowIdx
      const nextColWrapped = nextCol >= questions.length ? 0 : nextCol

      const cell = gridRef.current?.querySelector<HTMLElement>(
        `[data-row="${nextRow}"][data-col="${nextColWrapped}"]`
      )
      cell?.focus()

    }

    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      const prevCol = colIdx - 1
      const prevRow = prevCol < 0 ? rowIdx - 1 : rowIdx
      const prevColWrapped = prevCol < 0 ? questions.length - 1 : prevCol

      if (prevRow >= 0) {
        const cell = gridRef.current?.querySelector<HTMLElement>(
          `[data-row="${prevRow}"][data-col="${prevColWrapped}"]`
        )
        cell?.focus()

      }
    }

    // Ctrl+S to save all
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      handleSaveAll()
    }
  }, [questions.length])

  // Save all scores
  const handleSaveAll = async () => {
    setSaving(true)
    const upsertData: any[] = []

    for (const row of scoreRows) {
      for (const [question_id, status] of Object.entries(row.scores)) {
        if (status === 'ungraded') continue
        const maxMarks = questions.find(q => q.id === question_id)?.max_marks || 1
        upsertData.push({
          student_id: row.student_id,
          test_id: selectedTest,
          question_id,
          marks_obtained: status === 'correct' ? maxMarks : 0,
          is_correct: status === 'correct',
        })
      }
    }

    const { error } = await supabase
      .from('student_scores')
      .upsert(upsertData, { onConflict: 'student_id,question_id' })


    if (error) {
      toast.error(friendlyError(error))
    } else {
      toast.success(`Saved ${upsertData.length} scores successfully!`)
      // Mark all as saved
      const savedSet = new Set<string>()
      scoreRows.forEach((_, ri) => questions.forEach(q => savedSet.add(`${ri}-${q.id}`)))
      setSavedCells(savedSet)

      // Trigger Push Notification to affected parents
      const studentIds = [...new Set(upsertData.map(d => d.student_id))];
      if (studentIds.length > 0) {
        supabase.from('students').select('parent_id').in('id', studentIds)
        .then(({ data: students }) => {
            const parentIds = students?.map(s => s.parent_id).filter(Boolean) || [];
            if (parentIds.length > 0) {
                supabase.from('users').select('push_token').in('id', parentIds).not('push_token', 'is', null)
                .then(({ data: parents }) => {
                    const tokens = parents?.map(p => p.push_token).filter(Boolean) || [];
                    const testName = tests.find(t => t.id === selectedTest)?.test_name || 'your test';
                    
                    if (tokens.length > 0) {
                        fetch('/api/send-push', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(tokens.map(t => ({
                                to: t,
                                title: '📊 Test Results Published',
                                body: `Marks/Grading for "${testName}" have been uploaded.`
                            })))
                        }).catch(e => console.error('Marks push failed:', e));
                    }
                });
            }
        });
      }
    }
    setSaving(false)
  }

  // New Test modal (simplified inline)
  const [showNewTest, setShowNewTest] = useState(false)

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-cosmos-text">Marks Entry</h1>
            <p className="text-cosmos-muted text-sm mt-0.5">Tab to move between cells · Ctrl+S to save all</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNewTest(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus size={15} /> New Test
            </button>
            {scoreRows.length > 0 && (
              <button onClick={handleSaveAll} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save All
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-cosmos-muted uppercase tracking-wider mb-1.5">Batch</label>
            <div className="relative">
              <select
                className="cosmos-input appearance-none pr-8 cursor-pointer"
                value={selectedBatch}
                onChange={e => { setSelectedBatch(e.target.value); setSelectedTest(''); setScoreRows([]) }}
              >
                <option value="">Select batch…</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.batch_name} — Grade {b.grade} {b.subject}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-cosmos-muted pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cosmos-muted uppercase tracking-wider mb-1.5">Test</label>
            <div className="relative">
              <select
                className="cosmos-input appearance-none pr-8 cursor-pointer"
                value={selectedTest}
                onChange={e => setSelectedTest(e.target.value)}
                disabled={!selectedBatch}
              >
                <option value="">Select test…</option>
                {tests.map(t => (
                  <option key={t.id} value={t.id}>{t.test_name} — {new Date(t.test_date).toLocaleDateString('en-IN')}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-cosmos-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Marks Grid */}
        {loadingStudents ? (
          <div className="cosmos-card flex items-center justify-center py-16">
            <Loader2 size={28} className="text-cosmos-blue animate-spin" />
          </div>
        ) : scoreRows.length > 0 && questions.length > 0 ? (
          <div className="cosmos-card overflow-x-auto p-0">
            <table ref={gridRef} className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-cosmos-border">
                  <th className="sticky left-0 bg-cosmos-card z-10 text-left py-3 px-4 text-cosmos-muted font-semibold uppercase tracking-wider text-xs w-48">
                    Student
                  </th>
                  {questions.map((q, ci) => (
                    <th key={q.id} className="py-3 px-2 text-center min-w-[80px]">
                      <div className="text-cosmos-text text-xs font-bold">Q{q.question_number}</div>
                      <div className="text-cosmos-blue text-xs font-mono">/{q.max_marks}</div>
                      <div className="text-cosmos-muted text-[10px] truncate max-w-[80px] mx-auto" title={(q as any).micro_tags?.concept_name}>
                        {(q as any).micro_tags?.concept_name?.split(' ').slice(0,2).join(' ')}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center text-cosmos-muted font-semibold uppercase tracking-wider text-xs">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {scoreRows.map((row, ri) => {
                  const total = Object.entries(row.scores).reduce((sum, [qid, status]) => {
                    const q = questions.find(qq => qq.id === qid)
                    return sum + (status === 'correct' ? (q?.max_marks || 0) : 0)
                  }, 0)
                  const maxTotal = questions.reduce((sum, q) => sum + q.max_marks, 0)
                  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0


                  return (
                    <tr key={row.student_id} className="border-b border-cosmos-border/50 hover:bg-cosmos-primary/[0.03]">
                      <td className="sticky left-0 bg-cosmos-card z-10 py-2 px-4 font-medium text-cosmos-text">
                        {row.student_name}
                      </td>
                      {questions.map((q, ci) => {
                        const cellKey = `${ri}-${q.id}`
                        const isSaved = savedCells.has(cellKey)
                        const status = row.scores[q.id] || 'ungraded'

                        return (
                          <td key={q.id} className="py-1 px-1 text-center">
                            <div className="relative flex items-center justify-center">
                              <button
                                onClick={() => toggleScoreStatus(ri, q.id)}
                                onKeyDown={e => handleKeyDown(e, ri, ci)}
                                data-row={ri}
                                data-col={ci}
                                className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${
                                  status === 'correct' ? 'bg-cosmos-green/10 border-cosmos-green text-cosmos-green hover:bg-cosmos-green/20' :
                                  status === 'incorrect' ? 'bg-cosmos-red/10 border-cosmos-red text-cosmos-red hover:bg-cosmos-red/20' :
                                  'bg-slate-50 border-cosmos-border/60 hover:border-cosmos-muted/50 text-cosmos-muted/60'
                                } ${isSaved ? 'shadow-[0_0_8px_rgba(34,197,94,0.2)]' : ''}`}
                                aria-label={`${row.student_name} Q${q.question_number}`}
                              >
                                {status === 'correct' && <CheckCircle size={14} className="stroke-[2.5]" />}
                                {status === 'incorrect' && <div className="text-sm font-bold">✕</div>}
                                {status === 'ungraded' && <div className="text-xs font-mono">/{q.max_marks}</div>}
                              </button>
                            </div>
                          </td>
                        )
                      })}

                      <td className="py-2 px-4 text-center">
                        <span className={`font-bold font-mono text-sm ${
                          pct >= 75 ? 'text-cosmos-green' :
                          pct >= 50 ? 'text-cosmos-gold' :
                          'text-cosmos-red'
                        }`}>
                          {total}/{maxTotal}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : selectedTest ? (
          <div className="cosmos-card text-center py-16 text-cosmos-muted">
            <AlertTriangle size={32} className="mx-auto mb-3 text-cosmos-gold opacity-50" />
            <p>No questions found for this test. Add questions first.</p>
          </div>
        ) : (
          <div className="cosmos-card text-center py-16 text-cosmos-muted">
            <p>Select a batch and test above to start entering marks.</p>
          </div>
        )}

        {/* New Test Modal */}
        {showNewTest && (
          <NewTestModal
            batches={batches}
            selectedBatch={selectedBatch}
            onClose={() => setShowNewTest(false)}
            onCreated={(test: Test, qs: any) => {
              setTests(prev => [test, ...prev])
              setSelectedTest(test.id)
              setShowNewTest(false)
            }}
          />
        )}
      </main>
    </div>
  )
}

// Inline New Test + Questions modal
function NewTestModal({ batches, selectedBatch, onClose, onCreated }: any) {
  const supabase = createClient()
  const [form, setForm] = useState({
    batch_id: selectedBatch || '',
    test_name: '',
    test_date: new Date().toISOString().split('T')[0],
    total_marks: '',
  })
  const [questions, setQuestions] = useState([{ question_number: 1, max_marks: '', micro_tag_id: '' }])
  const [tags, setTags] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('micro_tags').select('*').order('subject').then(({ data }) => setTags(data || []))
  }, [])

  const addQuestion = () => setQuestions(prev => [...prev, { question_number: prev.length + 1, max_marks: '', micro_tag_id: '' }])

  const handleSave = async () => {
    // Validate before hitting DB
    if (!form.batch_id) { toast.error('Please select a batch'); return }
    if (!form.test_name.trim()) { toast.error('Please enter a test name'); return }
    if (!form.test_date) { toast.error('Please select a test date'); return }
    if (questions.some(q => !q.max_marks || !q.micro_tag_id)) {
      toast.error('Please fill in marks and concept for every question'); return
    }

    setSaving(true)
    const totalMarks = questions.reduce((s, q) => s + (parseInt(q.max_marks) || 0), 0)

    if (totalMarks === 0) { toast.error('Total marks must be greater than 0'); setSaving(false); return }

    const { data: test, error: testErr } = await supabase.from('tests').insert({
      batch_id: form.batch_id,
      test_name: form.test_name,
      test_date: form.test_date,
      total_marks: totalMarks,
    }).select().single()

    if (testErr || !test) { toast.error(testErr ? friendlyError(testErr) : 'Failed to create test. Try again.'); setSaving(false); return }

    const { error: qErr } = await supabase.from('test_questions').insert(
      questions.map(q => ({
        test_id: test.id,
        question_number: q.question_number,
        max_marks: parseInt(q.max_marks),
        micro_tag_id: q.micro_tag_id,
      }))
    )

    if (qErr) { toast.error(friendlyError(qErr)); setSaving(false); return }

    toast.success('Test created!')
    onCreated(test, questions)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-cosmos-border flex items-center justify-between">
          <h2 className="font-display font-bold text-cosmos-text">New Test + Questions</h2>
          <button onClick={onClose} className="text-cosmos-muted hover:text-cosmos-text">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {/* Test details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Batch</label>
              <select className="cosmos-input" value={form.batch_id} onChange={e => setForm(p => ({ ...p, batch_id: e.target.value }))}>
                {batches.map((b: Batch) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-cosmos-muted mb-1">Test Date</label>
              <input type="date" className="cosmos-input" value={form.test_date} onChange={e => setForm(p => ({ ...p, test_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-cosmos-muted mb-1">Test Name</label>
            <input type="text" className="cosmos-input" placeholder="e.g. Unit Test 1 — Algebra" value={form.test_name} onChange={e => setForm(p => ({ ...p, test_name: e.target.value }))} />
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-cosmos-muted font-semibold uppercase tracking-wider">Questions</label>
              <button onClick={addQuestion} className="text-cosmos-blue text-xs flex items-center gap-1 hover:text-cosmos-text">
                <Plus size={12} /> Add Q
              </button>
            </div>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-center text-cosmos-muted text-sm font-mono">Q{q.question_number}</div>
                  <div className="col-span-2">
                    <input type="number" className="cosmos-input text-center" placeholder="Marks" value={q.max_marks}
                      onChange={e => setQuestions(prev => prev.map((qq, ii) => ii === i ? { ...qq, max_marks: e.target.value } : qq))} />
                  </div>
                  <div className="col-span-9">
                    <select className="cosmos-input text-sm" value={q.micro_tag_id}
                      onChange={e => setQuestions(prev => prev.map((qq, ii) => ii === i ? { ...qq, micro_tag_id: e.target.value } : qq))}>
                      <option value="">Select concept…</option>
                      {tags.map(t => <option key={t.id} value={t.id}>{t.full_path}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-cosmos-border flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Create Test & Questions
          </button>
        </div>
      </div>
    </div>
  )
}
