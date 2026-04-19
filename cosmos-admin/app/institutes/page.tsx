'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Plus, Building2, Phone, MapPin, Loader2, MoreVertical, ShieldCheck, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useGlobalContext } from '@/lib/GlobalContext'

export default function InstitutesPage() {
    const supabase = createClient()
    const router = useRouter()
    const { role } = useGlobalContext()
    const [institutes, setInstitutes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Strict Route Protection: Only Super Admins can access this page
        if (role && role !== 'super_admin') {
            router.push('/dashboard')
        }
    }, [role, router])

    const load = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('institutes')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
        
        if (error) {
            console.error("Fetch error:", error)
            toast.error(error.message)
        } else if (data) {
            try {
                // Fetch metrics (Optional, don't crash if it fails)
                const { data: metrics, error: metricsError } = await supabase.rpc('get_institute_metrics')
                
                if (metricsError) {
                    console.error("Metrics RPC error:", metricsError)
                }

                const enriched = (data || []).map(inst => {
                    const m = metrics?.find((x: any) => x.institute_id === inst.id)
                    return { 
                        ...inst, 
                        student_count: m?.student_count || 0, 
                        batch_count: m?.batch_count || 0 
                    }
                })
                setInstitutes(enriched)
            } catch (err) {
                console.error("Processing error:", err)
                setInstitutes(data || [])
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        load()
    }, [])

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('institutes')
            .update({ is_active: !currentStatus })
            .eq('id', id)
        
        if (error) toast.error('Update failed')
        else {
            toast.success(`Institute ${!currentStatus ? 'Activated' : 'Deactivated'}`)
            load()
        }
    }

    if (!role) {
        return (
            <div className="flex min-h-screen bg-cosmos-bg star-bg">
                <Sidebar />
                <main className="md:ml-64 flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-cosmos-primary" size={32} />
                </main>
            </div>
        )
    }

    if (role !== 'super_admin') {
        return null // Will redirect in useEffect
    }

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-bold text-cosmos-text tracking-tight">Clinics & Centers</h1>
                        <p className="text-cosmos-muted text-sm mt-1">Master Management: Manage your B2B customers and institutes</p>
                    </div>
                    <Link href="/institutes/new" className="btn-primary flex items-center gap-2 px-5 py-2.5">
                        <Plus size={18} /> Add New Center
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-cosmos-primary" size={32} />
                    </div>
                ) : institutes.length === 0 ? (
                    <div className="cosmos-card text-center py-16 opacity-60">
                        <Building2 size={48} className="mx-auto mb-4 text-cosmos-muted" />
                        <p className="text-cosmos-text font-medium">No institutes registered yet.</p>
                        <p className="text-cosmos-muted text-sm">Start by adding your first B2B customer.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {institutes.map(inst => (
                            <div key={inst.id} className="cosmos-card p-6 border-cosmos-border/40 transition-all hover:border-cosmos-primary/30 group relative overflow-hidden">
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${inst.is_active ? 'bg-cosmos-green/10 text-cosmos-green' : 'bg-cosmos-red/10 text-cosmos-red'}`}>
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-display font-bold text-lg text-cosmos-text group-hover:text-cosmos-primary transition-colors">{inst.name}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-cosmos-muted text-xs">
                                                <div className="flex items-center gap-1.5"><MapPin size={12} /> {inst.address || 'No address'}</div>
                                                <div className="flex items-center gap-1.5"><Phone size={12} /> {inst.contact_phone || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                                            inst.is_active 
                                            ? 'bg-cosmos-green/5 border-cosmos-green/20 text-cosmos-green' 
                                            : 'bg-cosmos-red/5 border-cosmos-red/20 text-cosmos-red'
                                        }`}>
                                            {inst.is_active ? 'Active' : 'Suspended'}
                                        </span>
                                        <button 
                                            onClick={() => toggleStatus(inst.id, inst.is_active)}
                                            className="text-xs text-cosmos-muted hover:text-cosmos-primary underline underline-offset-4"
                                        >
                                            {inst.is_active ? 'Deactivate' : 'Reactivate'}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="mt-6 flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-cosmos-subtle uppercase tracking-widest font-black mb-1">Students</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-cosmos-blue/10 flex items-center justify-center text-cosmos-blue font-bold text-sm">
                                                {inst.student_count}
                                            </div>
                                            <span className="text-xs text-cosmos-muted font-medium">Enrolled</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-cosmos-subtle uppercase tracking-widest font-black mb-1">Batches</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-cosmos-purple/10 flex items-center justify-center text-cosmos-purple font-bold text-sm">
                                                {inst.batch_count}
                                            </div>
                                            <span className="text-xs text-cosmos-muted font-medium">Active</span>
                                        </div>
                                    </div>
                                    <div className="ml-auto">
                                        <Link href={`/institutes/${inst.id}`} className="flex items-center gap-1.5 text-xs font-bold text-cosmos-primary hover:text-cosmos-peach transition-colors group/link">
                                            Manage Center <Plus size={14} className="group-hover/link:rotate-90 transition-transform" />
                                        </Link>
                                    </div>
                                </div>
                                
                                <div className="mt-6 pt-6 border-t border-cosmos-border/30 flex items-center justify-between relative z-10">
                                    <div className="text-[10px] text-cosmos-subtle">
                                        Partner since: {new Date(inst.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-cosmos-muted uppercase tracking-tighter">
                                        <ShieldCheck size={14} className="text-cosmos-green" />
                                        Secure Isolation Active
                                    </div>
                                </div>

                                {/* Decorative Background Gradient */}
                                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cosmos-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
