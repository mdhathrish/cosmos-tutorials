'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { ArrowLeft, Building2, UserPlus, ShieldCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function NewInstitutePage() {
    const supabase = createClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Form State
    const [instName, setInstName] = useState('')
    const [address, setAddress] = useState('')
    const [phone, setPhone] = useState('')
    
    // Primary Admin State
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('Welcome@123')
    const [adminName, setAdminName] = useState('')

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // 1. Create the Institute entry
            const { data: inst, error: instError } = await supabase
                .from('institutes')
                .insert({
                    name: instName,
                    address,
                    contact_phone: phone,
                    is_active: true
                })
                .select()
                .single()

            if (instError) throw new Error(`Institute creation failed: ${instError.message}`)

            // 2. Create the first Admin user via API Proxy (for Service Role bypass)
            const res = await fetch('/api/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    full_name: adminName,
                    role: 'admin', // Role is center_admin or admin in user_role_check
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

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-20 md:pt-8">
                <Link href="/institutes" className="text-cosmos-muted hover:text-cosmos-text text-sm flex items-center gap-1.5 mb-8 transition-colors">
                    <ArrowLeft size={16} /> Back to Institutes
                </Link>

                <div className="max-w-3xl mx-auto">
                    <div className="mb-10 text-center md:text-left">
                        <h1 className="font-display text-4xl font-bold text-cosmos-text tracking-tighter">Onboard New Center</h1>
                        <p className="text-cosmos-muted mt-2">Initialize a new instance for your B2B customer.</p>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-8 pb-20">
                        {/* Center Info Section */}
                        <div className="cosmos-card p-6 border-cosmos-primary/20 bg-cosmos-primary/5">
                            <div className="flex items-center gap-2 mb-6">
                                <Building2 size={20} className="text-cosmos-primary" />
                                <h2 className="font-display font-bold text-xl text-cosmos-text">Institute Details</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Institution Name</label>
                                    <input required placeholder="E.g. Sri Chaitanya Hyderabad" 
                                        className="cosmos-input" value={instName} onChange={e => setInstName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Contact Phone</label>
                                    <input placeholder="+91..." className="cosmos-input" value={phone} onChange={e => setPhone(e.target.value)} />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Physical Address</label>
                                    <input placeholder="Enter full branch address" className="cosmos-input" value={address} onChange={e => setAddress(e.target.value)} />
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
