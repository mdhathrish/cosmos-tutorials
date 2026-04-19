'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { 
    ArrowLeft, Building2, Users, 
    Mail, ShieldAlert, Loader2, Key, ExternalLink,
    Clock, ShieldCheck, AlertTriangle, Eye, EyeOff
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function InstituteDetailPage({ params }: { params: { id: string } }) {
    const { id } = params
    const supabase = createClient()
    const [institute, setInstitute] = useState<any>(null)
    const [staff, setStaff] = useState<any[]>([])
    const [studentCount, setStudentCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const [selectedStaff, setSelectedStaff] = useState<any | null>(null)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [suspending, setSuspending] = useState(false)

    const loadData = async () => {
        setLoading(true)
        const { data: inst } = await supabase.from('institutes').select('*').eq('id', id).single()
        setInstitute(inst)

        const { data: users } = await supabase
            .from('users')
            .select('*')
            .eq('institute_id', id)
            .in('role', ['admin', 'teacher'])
            .order('role')
        setStaff(users || [])

        const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('institute_id', id)
            .eq('is_active', true)
        setStudentCount(count || 0)

        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [id])

    const handleToggleStatus = async () => {
        const action = institute?.is_active ? 'Suspend' : 'Activate'
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} "${institute?.name}"?`)) return
        
        setSuspending(true)
        const { error } = await supabase
            .from('institutes')
            .update({ is_active: !institute?.is_active })
            .eq('id', id)

        if (error) {
            toast.error(error.message)
        } else {
            toast.success(`Institute ${institute?.is_active ? 'suspended' : 'activated'} successfully`)
            loadData()
        }
        setSuspending(false)
    }

    if (loading) {
        return (
            <div className="flex min-h-screen bg-cosmos-bg star-bg">
                <Sidebar />
                <main className="md:ml-64 flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-cosmos-primary" size={32} />
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-20 md:pt-8">
                <Link href="/institutes" className="text-cosmos-muted hover:text-cosmos-text text-sm flex items-center gap-1.5 mb-8 transition-colors">
                    <ArrowLeft size={16} /> All Centers
                </Link>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-3xl border flex items-center justify-center shadow-glow-blue transition-all ${
                            institute?.is_active ? 'bg-cosmos-primary/10 border-cosmos-primary/20 text-cosmos-primary' : 'bg-cosmos-red/10 border-cosmos-red/20 text-cosmos-red'
                        }`}>
                            <Building2 size={40} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="font-display text-4xl font-black text-cosmos-text tracking-tighter">{institute?.name}</h1>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
                                    institute?.is_active 
                                    ? 'bg-cosmos-green/5 border-cosmos-green/20 text-cosmos-green shadow-glow-green/20' 
                                    : 'bg-cosmos-red/5 border-cosmos-red/20 text-cosmos-red'
                                }`}>
                                    {institute?.is_active ? 'Active' : 'Suspended'}
                                </span>
                            </div>
                            <p className="text-cosmos-muted flex items-center gap-2 text-sm italic">
                                <ShieldAlert size={14} className="text-cosmos-primary" /> Master Management Dashboard
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="cosmos-card p-4 bg-cosmos-blue/5 border-cosmos-blue/20 flex flex-col items-center justify-center text-center px-8">
                             <div className="text-2xl font-black text-cosmos-blue">{studentCount}</div>
                             <div className="text-[10px] text-cosmos-subtle uppercase tracking-widest font-bold">Students</div>
                        </div>
                        <div className="cosmos-card p-4 bg-cosmos-purple/5 border-cosmos-purple/20 flex flex-col items-center justify-center text-center px-8">
                             <div className="text-2xl font-black text-cosmos-purple">{staff.length}</div>
                             <div className="text-[10px] text-cosmos-subtle uppercase tracking-widest font-bold">Staff Members</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-cosmos-primary" />
                                <h2 className="font-display font-bold text-xl text-cosmos-text">Staff & Administrators</h2>
                            </div>
                        </div>

                        <div className="cosmos-card p-0 overflow-hidden divide-y divide-cosmos-border/30">
                            {staff.map(member => (
                                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-cosmos-primary/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-cosmos-surface border border-cosmos-border flex items-center justify-center text-cosmos-muted font-bold">
                                            {member.full_name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-cosmos-text text-sm">{member.full_name}</h3>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${
                                                    member.role === 'admin' ? 'bg-cosmos-blue/10 text-cosmos-blue' : 'bg-cosmos-purple/10 text-cosmos-purple'
                                                }`}>
                                                    {member.role === 'admin' ? 'Center Admin' : 'Teacher'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-cosmos-muted mt-0.5">
                                                <Mail size={12} /> {member.email}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => { setSelectedStaff(member); setShowPasswordModal(true) }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cosmos-surface border border-cosmos-border text-[11px] font-bold text-cosmos-muted hover:text-cosmos-primary hover:border-cosmos-primary/30 transition-all sm:opacity-0 group-hover:opacity-100"
                                    >
                                        <Key size={12} />
                                        Update Password
                                    </button>
                                </div>
                            ))}
                            {staff.length === 0 && (
                                <div className="p-12 text-center text-cosmos-muted">No staff accounts found.</div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="cosmos-card bg-cosmos-surface/30 space-y-6 border-dashed border-cosmos-border/60">
                             <h3 className="font-bold text-cosmos-text flex items-center gap-2">
                                <Clock size={16} className="text-cosmos-primary" /> Enrollment History
                             </h3>
                             <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-cosmos-green shadow-glow-green" />
                                    <div>
                                        <div className="text-xs font-bold text-cosmos-text">Institute Created</div>
                                        <div className="text-[10px] text-cosmos-muted">{new Date(institute?.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-cosmos-blue shadow-glow-blue" />
                                    <div>
                                        <div className="text-xs font-bold text-cosmos-text">Secure Isolation</div>
                                        <div className="text-[10px] text-cosmos-muted tracking-tight">Active for {institute?.id?.slice(0, 8)}...</div>
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div className="cosmos-card border-cosmos-primary/20 bg-cosmos-primary/5">
                            <h3 className="font-bold text-cosmos-text text-sm mb-2 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-cosmos-primary" /> Master Controls
                            </h3>
                            <p className="text-xs text-cosmos-muted mb-4 leading-relaxed">
                                You have global authority to override settings and manage this specific center&apos;s lifecycle.
                            </p>
                            <div className="space-y-2">
                                <Link 
                                    href={`/preview/${id}`}
                                    className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2 bg-white"
                                >
                                    <ExternalLink size={12} /> View Public Profile
                                </Link>
                                <button 
                                    onClick={handleToggleStatus}
                                    disabled={suspending}
                                    className={`w-full px-4 py-2 border text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                                        institute?.is_active 
                                        ? 'bg-cosmos-red/10 border-cosmos-red/20 text-cosmos-red hover:bg-cosmos-red/20' 
                                        : 'bg-cosmos-green/10 border-cosmos-green/20 text-cosmos-green hover:bg-cosmos-green/20'
                                    }`}
                                >
                                    {suspending ? <Loader2 size={12} className="animate-spin" /> : institute?.is_active ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                                    {institute?.is_active ? 'Suspend Institute' : 'Reactivate Center'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {showPasswordModal && selectedStaff && (
                    <PasswordModal 
                        staff={selectedStaff} 
                        onClose={() => { setShowPasswordModal(false); setSelectedStaff(null) }} 
                    />
                )}
            </main>
        </div>
    )
}

function PasswordModal({ staff, onClose }: { staff: any, onClose: () => void }) {
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [saving, setSaving] = useState(false)

    const handleUpdate = async () => {
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setSaving(true)
        const res = await fetch('/api/update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_id: staff.auth_id,
                password: password
            })
        })

        const result = await res.json()
        if (result.success) {
            toast.success('Password updated successfully')
            onClose()
        } else {
            toast.error(result.error || 'Failed to update password')
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-cosmos-border">
                    <h2 className="font-display font-bold text-cosmos-text">Direct Password Update</h2>
                    <p className="text-xs text-cosmos-muted mt-1 leading-tight">Setting new access credentials for <span className="text-cosmos-primary font-bold">{staff.full_name}</span>.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase tracking-wider">New Password</label>
                        <div className="relative">
                            <input 
                                className="cosmos-input pr-10" 
                                type={showPass ? 'text' : 'password'}
                                placeholder="Min 6 characters" 
                                value={password}
                                autoFocus
                                onChange={e => setPassword(e.target.value)} 
                            />
                            <button onClick={() => setShowPass(p => !p)} type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-cosmos-muted hover:text-cosmos-text transition-colors">
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-cosmos-surface border-t border-cosmos-border flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                    <button onClick={handleUpdate} disabled={saving} className="btn-primary text-xs flex items-center gap-2 px-6 py-2">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Key size={12} />}
                        Confirm Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
