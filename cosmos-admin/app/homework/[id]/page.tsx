'use client'
import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, ExternalLink, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function HomeworkDetail({ params }: { params: { id: string } }) {
    const { id } = params
    const supabase = createClient()
    const [hw, setHw] = useState<any>(null)
    const [subs, setSubs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const load = async () => {
        const { data: hwData } = await supabase
            .from('homework')
            .select('*, batches(batch_name, grade)')
            .eq('id', id)
            .single()
        setHw(hwData)

        if (hwData) {
            const { data: subsData } = await supabase
                .from('homework_submissions')
                .select('*, student:students(id, full_name, parent_id)')
                .eq('homework_id', id)
            setSubs(subsData || [])
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [id])

    const handleMarkNotDone = async (sub: any) => {
        const { error } = await supabase
            .from('homework_submissions')
            .update({ status: 'pending', grade: 'Not Done' })
            .eq('id', sub.id)

        if (error) { toast.error('Failed to update'); return }

        // Fetch parent push token
        const { data: parent } = await supabase
            .from('users')
            .select('push_token')
            .eq('id', sub.student.parent_id)
            .single()

        if (parent?.push_token) {
            try {
                // Call local Next.js Backend Proxy to bypass CORS limits
                const res = await fetch('/api/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: parent.push_token,
                        title: '⚠️ Homework Alert',
                        body: `${sub.student.full_name} did not complete homework: "${hw.title}". Please ensure it gets done.`,
                    }),
                })
                
                const resData = await res.json();
                
                if (resData.errors) {
                    toast.error(`Expo Error: ${resData.errors[0].message}`);
                } else if (resData.data && resData.data.status === 'error') {
                    toast.error(`Push Failed: ${resData.data.message}`);
                } else if (resData.error) {
                    toast.error(`Server Error: ${resData.error}`);
                } else {
                    toast.success(`Marked as Not Done. Notify sent to parent.`);
                }
            } catch (e: any) {
                toast.error(`Network Error: ${e.message}`);
            }
        } else {
            toast.error('Student has no registered parent push token!')
        }

        load()
    }

    const handleMarkGraded = async (sub: any, grade: string) => {
        const { error } = await supabase
            .from('homework_submissions')
            .update({ status: 'graded', grade })
            .eq('id', sub.id)
        if (error) toast.error('Failed')
        else { toast.success('Grade saved'); load() }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen bg-cosmos-bg star-bg">
                <Sidebar />
                <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-20 md:pt-8 flex items-center justify-center">
                    <Loader2 size={32} className="text-cosmos-primary animate-spin" />
                </main>
            </div>
        )
    }

    if (!hw) {
        return (
            <div className="flex min-h-screen bg-cosmos-bg star-bg">
                <Sidebar />
                <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-20 md:pt-8 text-center text-cosmos-muted">Homework not found</main>
            </div>
        )
    }

    const pending = subs.filter(s => s.status === 'pending')
    const submitted = subs.filter(s => s.status !== 'pending')

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-20 md:pt-8">
                <Link href="/homework" className="text-cosmos-muted hover:text-cosmos-text text-sm flex items-center gap-1.5 mb-6 transition-colors">
                    <ArrowLeft size={16} /> Back to Homeworks
                </Link>

                <div className="cosmos-card mb-8">
                    <h1 className="font-display text-2xl font-bold text-cosmos-text mb-2">{hw.title}</h1>
                    {hw.description && <p className="text-cosmos-muted text-sm mb-4">{hw.description}</p>}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-xs">
                            <span className="badge-blue">{hw.batches?.batch_name} (Grade {hw.batches?.grade})</span>
                            <span className="font-mono text-cosmos-orange">Due: {new Date(hw.due_date + 'T00:00:00').toLocaleDateString('en-IN')}</span>
                        </div>
                        {hw.attachment_url && (
                            <a href={hw.attachment_url} target="_blank" rel="noreferrer" 
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cosmos-primary text-white text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
                            >
                                <FileText size={14} /> View Homework PDF <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pending Section */}
                    <div>
                        <h3 className="font-display font-bold text-cosmos-text mb-4 flex items-center gap-2">
                            <AlertCircle size={18} className="text-cosmos-orange" />
                            Pending / Not Done ({pending.length})
                        </h3>
                        <div className="space-y-3">
                            {pending.length === 0 ? <p className="text-sm text-cosmos-muted px-2">None pending.</p> : null}
                            {pending.map(s => (
                                <div key={s.id} className="cosmos-card p-4 flex items-center justify-between bg-cosmos-card/40">
                                    <div>
                                        <p className="font-semibold text-cosmos-text text-sm">{s.student?.full_name}</p>
                                        <p className="text-xs text-cosmos-muted mt-0.5">{s.grade === 'Not Done' ? <span className="text-cosmos-red">Marked Not Done</span> : 'No submission'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1 border-r border-cosmos-border pr-2 mr-1">
                                            <button onClick={() => handleMarkGraded(s, 'A+')} className="p-1 px-1.5 text-xs rounded bg-cosmos-surface border border-cosmos-border text-cosmos-text hover:bg-cosmos-border transition-colors">A+</button>
                                            <button onClick={() => handleMarkGraded(s, 'A')} className="p-1 px-1.5 text-xs rounded bg-cosmos-surface border border-cosmos-border text-cosmos-text hover:bg-cosmos-border transition-colors">A</button>
                                            <button onClick={() => handleMarkGraded(s, 'B')} className="p-1 px-1.5 text-xs rounded bg-cosmos-surface border border-cosmos-border text-cosmos-text hover:bg-cosmos-border transition-colors">B</button>
                                        </div>
                                        <button onClick={() => handleMarkNotDone(s)} className="btn-secondary text-xs border-cosmos-red/40 text-cosmos-red hover:bg-cosmos-red hover:text-white transition-colors duration-300">
                                            Mark Not Done
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submitted / Graded Section */}
                    <div>
                        <h3 className="font-display font-bold text-cosmos-text mb-4 flex items-center gap-2">
                            <CheckCircle size={18} className="text-cosmos-green" />
                            Submitted ({submitted.length})
                        </h3>
                        <div className="space-y-3">
                            {submitted.length === 0 ? <p className="text-sm text-cosmos-muted px-2">No submissions yet.</p> : null}
                            {submitted.map(s => (
                                <div key={s.id} className="cosmos-card p-4 flex items-center justify-between bg-cosmos-green/5 border-cosmos-green/20">
                                    <div>
                                        <p className="font-semibold text-cosmos-text text-sm">{s.student?.full_name}</p>
                                        <p className="text-xs text-cosmos-muted mt-0.5">
                                            {s.status === 'graded' ? <span className="text-cosmos-green">Grade: {s.grade}</span> : 'Waiting for grade'}
                                        </p>
                                    </div>
                                    {s.status !== 'graded' ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleMarkGraded(s, 'A+')} className="p-1 px-2 text-xs rounded bg-cosmos-surface border border-cosmos-border text-cosmos-text hover:bg-cosmos-border">A+</button>
                                            <button onClick={() => handleMarkGraded(s, 'A')} className="p-1 px-2 text-xs rounded bg-cosmos-surface border border-cosmos-border text-cosmos-text hover:bg-cosmos-border">A</button>
                                            <button onClick={() => handleMarkGraded(s, 'B')} className="p-1 px-2 text-xs rounded bg-cosmos-surface border border-cosmos-border text-cosmos-text hover:bg-cosmos-border">B</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleMarkNotDone(s)} className="text-xs text-cosmos-red opacity-60 hover:opacity-100">Reset to Not Done</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
