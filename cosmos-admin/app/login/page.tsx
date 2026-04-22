'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Building2, ArrowLeft, Shield } from 'lucide-react'
import { PREDEFINED_THEMES, getThemeById } from '@/lib/themes'

interface InstituteBranding {
    id: string
    name: string
    logo_url: string | null
    theme_id: string | null
    tagline: string | null
    institute_code: string
}

export default function LoginPage() {
    const supabase = createClient()
    const router = useRouter()

    // Step state: 'code' → 'login'
    const [step, setStep] = useState<'code' | 'login'>('code')
    const [institute, setInstitute] = useState<InstituteBranding | null>(null)
    const [isSuperAdmin, setIsSuperAdmin] = useState(false)

    // Code entry
    const [code, setCode] = useState('')
    const [codeLoading, setCodeLoading] = useState(false)
    const [codeError, setCodeError] = useState('')

    // Login
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Derived theme colors
    const theme = institute?.theme_id ? getThemeById(institute.theme_id) : null
    const primaryColor = theme?.primary || '#4f46e5'
    const bgAccent = theme?.bg || '#eef2ff'

    // Check if there's a saved institute code in localStorage
    useEffect(() => {
        const saved = localStorage.getItem('cosmos_institute_code')
        if (saved) {
            lookupInstitute(saved)
        }
    }, [])

    const lookupInstitute = async (inputCode: string) => {
        setCodeLoading(true)
        setCodeError('')
        const trimmed = inputCode.trim().toUpperCase()
        if (!trimmed) { setCodeError('Please enter an institute code'); setCodeLoading(false); return }

        const { data, error } = await supabase
            .from('institutes')
            .select('id, name, logo_url, theme_id, tagline, institute_code')
            .eq('institute_code', trimmed)
            .single()

        if (error || !data) {
            setCodeError('Institute not found. Check the code and try again.')
            setCodeLoading(false)
            return
        }

        setInstitute(data)
        localStorage.setItem('cosmos_institute_code', trimmed)

        // Apply theme CSS variables immediately
        if (data.theme_id) {
            const t = getThemeById(data.theme_id)
            document.documentElement.style.setProperty('--cosmos-primary', t.primary)
            document.documentElement.style.setProperty('--cosmos-blue', t.secondary)
        }

        setStep('login')
        setCodeLoading(false)
    }

    const handleSuperAdmin = () => {
        setIsSuperAdmin(true)
        setInstitute(null)
        localStorage.removeItem('cosmos_institute_code')
        setStep('login')
    }

    const handleBack = () => {
        setStep('code')
        setInstitute(null)
        setIsSuperAdmin(false)
        setError('')
        localStorage.removeItem('cosmos_institute_code')
        // Reset CSS variables
        document.documentElement.style.setProperty('--cosmos-primary', '#4f46e5')
        document.documentElement.style.setProperty('--cosmos-blue', '#6366f1')
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(friendlyError(error)); setLoading(false); return }
        router.push('/dashboard')
    }

    // ───────── STEP 1: Institute Code Entry ─────────
    if (step === 'code') {
        return (
            <div className="min-h-screen bg-cosmos-bg star-bg flex items-center justify-center px-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-cosmos-primary/10 flex items-center justify-center mx-auto mb-4">
                            <Building2 size={32} className="text-cosmos-primary" />
                        </div>
                        <h1 className="font-display text-2xl font-bold text-cosmos-text">Enter Institute Code</h1>
                        <p className="text-cosmos-muted text-sm mt-2">Enter the code provided by your institute to continue</p>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); lookupInstitute(code) }} className="cosmos-card space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-cosmos-muted uppercase tracking-wider mb-1.5">Institute Code</label>
                            <input
                                type="text"
                                className="cosmos-input text-center text-lg font-bold tracking-[0.3em] uppercase"
                                placeholder="e.g. JSR001"
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase())}
                                required
                                autoFocus
                                maxLength={20}
                            />
                        </div>

                        {codeError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-500 text-sm">{codeError}</div>
                        )}

                        <button type="submit" disabled={codeLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                            {codeLoading ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
                            Find My Institute
                        </button>
                    </form>

                    {/* Super Admin bypass */}
                    <button
                        onClick={handleSuperAdmin}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm text-cosmos-muted hover:text-cosmos-primary hover:bg-cosmos-primary/5 transition-all duration-300"
                    >
                        <Shield size={14} />
                        Super Admin Login
                    </button>
                </div>
            </div>
        )
    }

    // ───────── STEP 2: Branded Login Form ─────────
    return (
        <div className="min-h-screen star-bg flex items-center justify-center px-4 transition-colors duration-500"
             style={{ backgroundColor: isSuperAdmin ? undefined : bgAccent }}>
            <div className="w-full max-w-sm">
                {/* Back button */}
                <button onClick={handleBack} className="flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity"
                        style={{ color: primaryColor }}>
                    <ArrowLeft size={16} />
                    Change Institute
                </button>

                {/* Branded Header */}
                <div className="text-center mb-8">
                    {institute?.logo_url ? (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm overflow-hidden border"
                             style={{ borderColor: primaryColor + '30' }}>
                            <img src={institute.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm"
                             style={{ backgroundColor: primaryColor + '15' }}>
                            {isSuperAdmin ? (
                                <Shield size={32} style={{ color: primaryColor }} />
                            ) : (
                                <span className="text-2xl font-black" style={{ color: primaryColor }}>
                                    {institute?.name?.[0] || 'C'}
                                </span>
                            )}
                        </div>
                    )}
                    <h1 className="font-display text-2xl font-bold" style={{ color: primaryColor }}>
                        {isSuperAdmin ? 'Cosmos Platform' : institute?.name || 'Academy'}
                    </h1>
                    <p className="text-cosmos-muted text-sm mt-1">
                        {isSuperAdmin ? 'Super Admin · Master Portal' : institute?.tagline || 'Admin · Teacher Portal'}
                    </p>
                    {institute && (
                        <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                             style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>
                            <Building2 size={10} />
                            {institute.institute_code}
                        </div>
                    )}
                </div>

                {/* Login Card */}
                <form onSubmit={handleLogin} className="cosmos-card space-y-4"
                      style={{ borderColor: primaryColor + '20' }}>
                    <div>
                        <label className="block text-xs font-semibold text-cosmos-muted uppercase tracking-wider mb-1.5">Email</label>
                        <input type="email" className="cosmos-input" placeholder="you@example.com"
                            value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-cosmos-muted uppercase tracking-wider mb-1.5">Password</label>
                        <input type="password" className="cosmos-input" placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-500 text-sm">{error}</div>
                    )}
                    <button type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        Sign In
                    </button>
                </form>

                <p className="text-center text-cosmos-subtle text-xs mt-6">
                    {isSuperAdmin ? 'Cosmos Platform · Master Control' : `${institute?.name || 'Academy'} · Powered by Cosmos`}
                </p>
            </div>
        </div>
    )
}