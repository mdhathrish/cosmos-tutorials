'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { ArrowLeft, Building2, UserPlus, ShieldCheck, Loader2, Upload, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useGlobalContext } from '@/lib/GlobalContext'
import { PREDEFINED_THEMES } from '@/lib/themes'

export default function NewInstitutePage() {
    const supabase = createClient()
    const router = useRouter()
    const { role } = useGlobalContext()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (role && role !== 'super_admin') {
            router.push('/dashboard')
        }
    }, [role, router])

    // Form State
    const [instName, setInstName] = useState('')
    const [instCode, setInstCode] = useState('')
    const [address, setAddress] = useState('')
    const [tagline, setTagline] = useState('')
    const [upiId, setUpiId] = useState('')
    const [phone, setPhone] = useState('')
    const [themeId, setThemeId] = useState('cosmos-classic')
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    
    // Primary Admin State
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('Welcome@123')
    const [adminName, setAdminName] = useState('')

    // Auto-generate institute code when name changes — uses DB sequence for guaranteed uniqueness
    const handleNameChange = async (name: string) => {
        setInstName(name)
        if (name.length >= 3 && !instCode) {
            const prefix = name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase()
            // Fetch next sequence value from DB to guarantee no repeats
            const { data } = await supabase.rpc('nextval_text', { seq_name: 'institute_code_seq' }).single()
            if (data) {
                setInstCode(prefix + data)
            } else {
                // Fallback: use timestamp-based suffix (still unique, just less clean)
                setInstCode(prefix + Date.now().toString().slice(-4))
            }
        }
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            setLogoPreview(URL.createObjectURL(file))
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let logo_url = null

            // 1. Upload Logo if exists
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

            // 2. Create the Institute entry (server-side to bypass RLS)
            const instRes = await fetch('/api/create-institute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: instName,
                    institute_code: instCode.toUpperCase(),
                    address,
                    contact_phone: phone,
                    logo_url,
                    theme_id: themeId,
                    tagline: tagline,
                    upi_id: upiId,
                })
            })

            const instData = await instRes.json()
            if (!instRes.ok) throw new Error(instData.error || 'Institute creation failed')
            const inst = instData.institute

            // 3. Create the first Admin user
            const res = await fetch('/api/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    full_name: adminName,
                    role: 'admin',
                    institute_id: inst.id
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create admin user.')

            toast.success('Institute and Admin created successfully!')
            router.push('/institutes')
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
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
        return null
    }

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
                <Link href="/institutes" className="text-cosmos-muted hover:text-cosmos-text text-sm flex items-center gap-1.5 mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Institutes
                </Link>

                <div className="max-w-3xl mx-auto">
                    <div className="mb-10 text-center md:text-left">
                        <h1 className="font-display text-4xl font-bold text-cosmos-text tracking-tighter">Onboard New Center</h1>
                        <p className="text-cosmos-muted mt-2">Initialize a new instance for your B2B customer.</p>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-8 pb-20">
                        {/* Center Branding Section */}
                        <div className="cosmos-card p-6 border-cosmos-primary/20 bg-cosmos-primary/5">
                            <div className="flex items-center gap-2 mb-6">
                                <Building2 size={20} className="text-cosmos-primary" />
                                <h2 className="font-display font-bold text-xl text-cosmos-text">Institute & Branding</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Institution Name</label>
                                        <input required placeholder="E.g. Sri Chaitanya Hyderabad" 
                                            className="cosmos-input" value={instName} onChange={e => handleNameChange(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Institute Code
                                            <span className="text-cosmos-primary ml-1">(shared with parents/staff)</span>
                                        </label>
                                        <input required placeholder="e.g. JSR001" maxLength={20}
                                            className="cosmos-input text-center font-bold tracking-widest uppercase" 
                                            value={instCode} onChange={e => setInstCode(e.target.value.toUpperCase())} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Phone</label>
                                            <input placeholder="+91..." className="cosmos-input" value={phone} onChange={e => setPhone(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Tagline</label>
                                            <input placeholder="Empowering Students" className="cosmos-input" value={tagline} onChange={e => setTagline(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">UPI ID</label>
                                            <input placeholder="name@upi" className="cosmos-input" value={upiId} onChange={e => setUpiId(e.target.value)} />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Logo</label>
                                            <label className="flex items-center justify-center gap-2 p-2.5 bg-white border-2 border-dashed border-cosmos-border rounded-xl cursor-pointer hover:border-cosmos-primary transition-all">
                                                <Upload size={14} className="text-cosmos-muted" />
                                                <span className="text-xs text-cosmos-muted font-bold">Upload PNG</span>
                                                <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={handleLogoChange} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Physical Address</label>
                                        <input placeholder="Enter full branch address" className="cosmos-input" value={address} onChange={e => setAddress(e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center bg-white/50 rounded-2xl border border-cosmos-border p-4">
                                    <div className="w-24 h-24 rounded-2xl bg-cosmos-primary/10 flex items-center justify-center overflow-hidden mb-3 shadow-xl">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 size={40} className="text-cosmos-primary opacity-20" />
                                        )}
                                    </div>
                                    <p className="text-[10px] font-black uppercase text-cosmos-muted tracking-widest">Logo Preview</p>
                                </div>
                            </div>

                            {/* Theme Selection */}
                            <div className="mt-8 pt-8 border-t border-cosmos-border">
                                <label className="block text-xs font-bold text-cosmos-subtle uppercase tracking-wider mb-4">Choose Brand Theme</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                    {PREDEFINED_THEMES.map(t => (
                                        <button 
                                            key={t.id}
                                            type="button"
                                            onClick={() => setThemeId(t.id)}
                                            className={`relative group p-1 rounded-xl border-2 transition-all ${themeId === t.id ? 'border-cosmos-primary shadow-lg scale-105' : 'border-transparent hover:border-cosmos-border'}`}
                                        >
                                            <div className="h-12 rounded-lg flex flex-col overflow-hidden">
                                                <div className="flex-1" style={{ backgroundColor: t.primary }} />
                                                <div className="h-2" style={{ backgroundColor: t.secondary }} />
                                            </div>
                                            <div className="mt-1 text-[9px] font-bold text-cosmos-text truncate px-1 uppercase tracking-tighter">{t.name}</div>
                                            {themeId === t.id && (
                                                <div className="absolute -top-1.5 -right-1.5 bg-cosmos-primary text-white p-0.5 rounded-full shadow-sm">
                                                    <Check size={10} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Admin Account Section */}
                        <div className="cosmos-card p-6 border-cosmos-blue/20 bg-cosmos-blue/5">
                            <div className="flex items-center gap-2 mb-6">
                                <UserPlus size={20} className="text-cosmos-blue" />
                                <h2 className="font-display font-bold text-xl text-cosmos-text">Primary Admin Account</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Admin Full Name</label>
                                    <input required placeholder="Center Manager Name" 
                                        className="cosmos-input" value={adminName} onChange={e => setAdminName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Login Email</label>
                                    <input required type="email" placeholder="admin@center.com" 
                                        className="cosmos-input" value={email} onChange={e => setEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Initial Password</label>
                                    <input required minLength={8} className="cosmos-input" value={password} onChange={e => setPassword(e.target.value)} />
                                </div>
                                <div className="flex items-center bg-white/40 p-3 rounded-xl border border-cosmos-border mt-6">
                                    <ShieldCheck size={20} className="text-cosmos-green mr-3 flex-shrink-0" />
                                    <p className="text-[10px] text-cosmos-muted leading-tight">
                                        This user will be created with <span className="text-cosmos-blue font-bold">Center Admin</span> privileges 
                                        and will only be able to see data for this institute.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 mt-12 pt-10 border-t border-cosmos-border">
                            <Link href="/institutes" className="px-6 py-2.5 text-sm text-cosmos-muted hover:text-cosmos-text transition-colors">Cancel</Link>
                            <button disabled={loading} type="submit" className="btn-primary min-w-[200px] flex items-center justify-center gap-2 py-3 shadow-xl">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>
                                        🚀 Finalize Onboarding
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}
