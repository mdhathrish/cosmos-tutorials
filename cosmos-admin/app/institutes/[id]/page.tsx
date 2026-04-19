import { PREDEFINED_THEMES } from '@/lib/themes'
import { Check, Upload } from 'lucide-react'

export default function InstituteDetailPage({ params }: { params: { id: string } }) {
    const { id } = params
    const supabase = createClient()
    const router = useRouter()
    const { role } = useGlobalContext()
    const [institute, setInstitute] = useState<any>(null)
    const [staff, setStaff] = useState<any[]>([])
    const [studentCount, setStudentCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const [selectedStaff, setSelectedStaff] = useState<any | null>(null)
    const [showStaffModal, setShowStaffModal] = useState(false)
    const [showInstModal, setShowInstModal] = useState(false)
    const [suspending, setSuspending] = useState(false)

    useEffect(() => {
        if (role && role !== 'super_admin') {
            router.push('/dashboard')
        }
    }, [role, router])

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

    if (!role || loading) {
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
        return null
    }

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
                <Link href="/institutes" className="text-cosmos-muted hover:text-cosmos-text text-sm flex items-center gap-1.5 mb-8 transition-colors">
                    <ArrowLeft size={16} /> All Centers
                </Link>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="flex items-center gap-6">
                        <div className={`w-20 h-20 rounded-3xl border flex items-center justify-center shadow-glow-blue transition-all overflow-hidden ${
                            institute?.is_active ? 'bg-cosmos-primary/10 border-cosmos-primary/20 text-cosmos-primary' : 'bg-cosmos-red/10 border-cosmos-red/20 text-cosmos-red'
                        }`}>
                            {institute?.logo_url ? (
                                <img src={institute.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Building2 size={40} />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="font-display text-4xl font-black text-cosmos-text tracking-tighter">{institute?.name}</h1>
                                <button 
                                    onClick={() => setShowInstModal(true)}
                                    className="p-1.5 rounded-full hover:bg-cosmos-surface text-cosmos-muted hover:text-cosmos-primary transition-all"
                                    title="Edit Institute Details"
                                >
                                    <Pencil size={16} />
                                </button>
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
                                            <div className="flex items-center gap-3 text-xs text-cosmos-muted mt-0.5">
                                                <div className="flex items-center gap-1"><Mail size={12} /> {member.email}</div>
                                                {member.phone && <div className="flex items-center gap-1"><Phone size={12} /> {member.phone}</div>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => { setSelectedStaff(member); setShowStaffModal(true) }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cosmos-surface border border-cosmos-border text-[11px] font-bold text-cosmos-muted hover:text-cosmos-primary hover:border-cosmos-primary/30 transition-all sm:opacity-0 group-hover:opacity-100"
                                    >
                                        <Pencil size={12} />
                                        Modify Account
                                    </button>
                                </div>
                            ))}
                            {staff.length === 0 && (
                                <div className="p-12 text-center text-cosmos-muted">No staff accounts found.</div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="cosmos-card bg-white space-y-6">
                             <h3 className="font-bold text-cosmos-text flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Building2 size={16} className="text-cosmos-primary" /> Center Info
                                </span>
                                <button onClick={() => setShowInstModal(true)} className="text-[10px] text-cosmos-primary hover:underline font-black uppercase">Edit</button>
                             </h3>
                             <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <MapPin size={16} className="text-cosmos-muted mt-0.5" />
                                    <div>
                                        <div className="text-[10px] text-cosmos-subtle uppercase tracking-widest font-black">Address</div>
                                        <div className="text-sm text-cosmos-text font-medium leading-snug">{institute?.address || 'Not set'}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <Phone size={16} className="text-cosmos-muted mt-0.5" />
                                    <div>
                                        <div className="text-[10px] text-cosmos-subtle uppercase tracking-widest font-black">Contact</div>
                                        <div className="text-sm text-cosmos-text font-medium">{institute?.contact_phone || 'Not set'}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 pt-2 border-t border-cosmos-border/30">
                                    <Clock size={16} className="text-cosmos-muted mt-0.5" />
                                    <div>
                                        <div className="text-[10px] text-cosmos-subtle uppercase tracking-widest font-black">Partner Since</div>
                                        <div className="text-sm text-cosmos-text font-medium">{institute?.created_at ? new Date(institute.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'}</div>
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

                {showStaffModal && selectedStaff && (
                    <StaffEditModal 
                        staff={selectedStaff} 
                        onClose={() => { setShowStaffModal(false); setSelectedStaff(null); loadData() }} 
                    />
                )}

                {showInstModal && (
                    <InstituteEditModal 
                        institute={institute}
                        onClose={() => { setShowInstModal(false); loadData() }}
                    />
                )}
            </main>
        </div>
    )
}

function StaffEditModal({ staff, onClose }: { staff: any, onClose: () => void }) {
    const [form, setForm] = useState({
        full_name: staff.full_name || '',
        email: staff.email || '',
        password: '',
        confirmPassword: ''
    })
    const [showPass, setShowPass] = useState(false)
    const [saving, setSaving] = useState(false)

    const handleUpdate = async () => {
        if (!form.full_name.trim()) return toast.error('Full name is required')
        if (!form.email.trim()) return toast.error('Email is required')
        
        if (form.password) {
            if (form.password.length < 6) return toast.error('Password must be at least 6 characters')
            if (form.password !== form.confirmPassword) return toast.error('Passwords do not match')
        }

        setSaving(true)
        const res = await fetch('/api/update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_id: staff.auth_id,
                full_name: form.full_name,
                email: form.email,
                password: form.password || undefined
            })
        })

        const result = await res.json()
        if (result.success) {
            toast.success('Account updated successfully')
            onClose()
        } else {
            toast.error(result.error || 'Update failed')
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-cosmos-border bg-cosmos-primary/5">
                    <h2 className="font-display font-bold text-cosmos-text">Modify Staff Account</h2>
                    <p className="text-xs text-cosmos-muted mt-1 leading-tight">Updating credentials for role: <span className="text-cosmos-primary font-bold uppercase">{staff.role}</span></p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase tracking-wider">Full Name</label>
                        <input className="cosmos-input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase tracking-wider">Email Address</label>
                        <input className="cosmos-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                        <p className="text-[10px] text-cosmos-muted mt-1">Current: <span className="font-bold">{staff.email}</span></p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase tracking-wider">New Password</label>
                            <div className="relative">
                                <input 
                                    className="cosmos-input pr-10" 
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••" 
                                    value={form.password}
                                    onChange={e => setForm({...form, password: e.target.value})} 
                                />
                                <button onClick={() => setShowPass(p => !p)} type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cosmos-muted hover:text-cosmos-text transition-colors">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase tracking-wider">Confirm</label>
                            <input 
                                className="cosmos-input" 
                                type={showPass ? 'text' : 'password'}
                                placeholder="••••••" 
                                value={form.confirmPassword}
                                onChange={e => setForm({...form, confirmPassword: e.target.value})} 
                            />
                        </div>
                    </div>
                    {form.password && form.password !== form.confirmPassword && (
                        <p className="text-[10px] text-cosmos-red font-bold animate-pulse">⚠️ Passwords do not match</p>
                    )}
                </div>
                <div className="p-6 bg-cosmos-surface border-t border-cosmos-border flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                    <button onClick={handleUpdate} disabled={saving} className="btn-primary text-xs flex items-center gap-2 px-6 py-2">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}

function InstituteEditModal({ institute, onClose }: { institute: any, onClose: () => void }) {
    const supabase = createClient()
    const [form, setForm] = useState({
        name: institute.name || '',
        contact_phone: institute.contact_phone || '',
        address: institute.address || '',
        theme_id: institute.theme_id || 'cosmos-classic'
    })
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(institute.logo_url || null)
    const [saving, setSaving] = useState(false)

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            setLogoPreview(URL.createObjectURL(file))
        }
    }

    const handleUpdate = async () => {
        if (!form.name.trim()) return toast.error('Name is required')
        
        setSaving(true)
        try {
            let logo_url = institute.logo_url

            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('institute_logos')
                    .upload(fileName, logoFile)

                if (uploadError) throw uploadError
                
                const { data: { publicUrl } } = supabase.storage
                    .from('institute_logos')
                    .getPublicUrl(fileName)
                
                logo_url = publicUrl
            }

            const { error } = await supabase
                .from('institutes')
                .update({ ...form, logo_url })
                .eq('id', institute.id)

            if (error) throw error
            
            toast.success('Institute branding updated')
            onClose()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4 overflow-y-auto pt-20 pb-10">
            <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-cosmos-border bg-cosmos-primary/5">
                    <h2 className="font-display font-bold text-cosmos-text flex items-center gap-2">
                        <Building2 size={20} className="text-cosmos-primary" /> Edit Brand & Center Info
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase tracking-wider">Institute Name</label>
                                <input className="cosmos-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase tracking-wider">Contact Phone</label>
                                <input className="cosmos-input" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase tracking-wider">Address</label>
                                <textarea className="cosmos-input h-20 pt-2" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase tracking-wider">Brand Logo</label>
                            <div className="flex flex-col items-center gap-4 bg-cosmos-surface p-4 rounded-2xl border border-cosmos-border">
                                <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg border border-cosmos-border">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 size={32} className="text-cosmos-muted opacity-20" />
                                    )}
                                </div>
                                <label className="flex items-center gap-2 px-4 py-2 bg-white border border-cosmos-border rounded-xl cursor-pointer hover:bg-cosmos-primary/5 transition-colors">
                                    <Upload size={14} className="text-cosmos-primary" />
                                    <span className="text-[10px] font-black uppercase text-cosmos-primary">Replace Logo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-cosmos-border">
                        <label className="block text-xs text-cosmos-muted mb-3 font-bold uppercase tracking-wider">Predefined Theme Palette</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                            {PREDEFINED_THEMES.map(t => (
                                <button 
                                    key={t.id}
                                    type="button"
                                    onClick={() => setForm({...form, theme_id: t.id})}
                                    className={`relative group p-1 rounded-xl border-2 transition-all ${form.theme_id === t.id ? 'border-cosmos-primary shadow-lg scale-105 bg-white' : 'border-transparent hover:border-cosmos-border'}`}
                                >
                                    <div className="h-10 rounded-lg flex flex-col overflow-hidden">
                                        <div className="flex-1" style={{ backgroundColor: t.primary }} />
                                        <div className="h-1.5" style={{ backgroundColor: t.secondary }} />
                                    </div>
                                    <div className="mt-1 text-[8px] font-bold text-cosmos-text truncate px-0.5 uppercase tracking-tighter">{t.name}</div>
                                    {form.theme_id === t.id && (
                                        <div className="absolute -top-1.5 -right-1.5 bg-cosmos-primary text-white p-0.5 rounded-full shadow-sm">
                                            <Check size={10} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-cosmos-surface border-t border-cosmos-border flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                    <button onClick={handleUpdate} disabled={saving} className="btn-primary text-xs flex items-center gap-2 px-6 py-2">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                        Save Branding Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
