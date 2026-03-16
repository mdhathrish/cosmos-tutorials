'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, Telescope } from 'lucide-react'

export default function LoginPage() {
    const supabase = createClient()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); setLoading(false); return }
        router.push('/dashboard')
    }

    return (
        <div className="min-h-screen bg-cosmos-bg star-bg flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-blue-gradient flex items-center justify-center mx-auto mb-4 shadow-glow-blue">
                        <Telescope size={24} className="text-cosmos-primary" />
                    </div>
                    <h1 className="font-display text-2xl font-bold text-cosmos-primary">Cosmos Tutorials</h1>
                    <p className="text-cosmos-muted text-sm mt-1">Admin · Teacher Portal</p>
                </div>

                {/* Card */}
                <form onSubmit={handleLogin} className="cosmos-card space-y-4">
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
                        <div className="bg-cosmos-red/10 border border-cosmos-red/30 rounded-lg px-3 py-2 text-cosmos-red text-sm">{error}</div>
                    )}
                    <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                        Sign In
                    </button>
                </form>

                <p className="text-center text-cosmos-subtle text-xs mt-6">Cosmos Tutorials · Hyderabad · IIT Foundation</p>
            </div>
        </div>
    )
}