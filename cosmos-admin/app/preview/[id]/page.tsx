'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { 
    Building2, MapPin, Phone, GraduationCap, 
    BookOpen, CheckCircle2, Globe, ArrowRight,
    Star, Users, ShieldCheck, Sparkles 
} from 'lucide-react'
import Link from 'next/link'

export default function InstitutePreviewPage({ params }: { params: { id: string } }) {
    const { id } = params
    const supabase = createClient()
    const [institute, setInstitute] = useState<any>(null)
    const [stats, setStats] = useState({ students: 0, batches: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const { data } = await supabase.from('institutes').select('*').eq('id', id).single()
            if (data) {
                setInstitute(data)
                const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('institute_id', id)
                const { count: bCount } = await supabase.from('batches').select('*', { count: 'exact', head: true }).eq('institute_id', id)
                setStats({ students: sCount || 0, batches: bCount || 0 })
            }
            setLoading(false)
        }
        load()
    }, [id])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-cosmos-bg">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-cosmos-primary/10 rounded-full" />
                <div className="h-4 w-32 bg-cosmos-border rounded" />
            </div>
        </div>
    )

    if (!institute) return (
        <div className="min-h-screen flex items-center justify-center bg-cosmos-bg text-cosmos-muted">
            <div className="text-center">
                <Building2 size={48} className="mx-auto mb-4 opacity-20" />
                <p>Institute profile not found or private.</p>
                <Link href="/" className="text-cosmos-primary hover:underline text-sm mt-4 block">Return Home</Link>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-cosmos-bg text-cosmos-text selection:bg-cosmos-primary/30">
            {/* Nav */}
            <nav className="border-b border-cosmos-border/40 backdrop-blur-md sticky top-0 z-50 bg-cosmos-bg/80">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cosmos-primary flex items-center justify-center text-white shadow-glow-blue">
                            <Building2 size={18} />
                        </div>
                        <span className="font-display font-black tracking-tighter text-xl">COSMOS</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-cosmos-muted">
                        <span className="text-cosmos-primary">Profile</span>
                        <span className="hover:text-cosmos-text cursor-pointer transition-colors">Courses</span>
                        <span className="hover:text-cosmos-text cursor-pointer transition-colors">Contact</span>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <header className="relative py-24 overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cosmos-primary/5 to-transparent blur-3xl -z-10" />
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1 space-y-6 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cosmos-primary/10 border border-cosmos-primary/20 text-cosmos-primary text-[10px] font-black uppercase tracking-[0.2em]">
                                <Sparkles size={12} /> Partner Institution
                            </div>
                            <h1 className="font-display text-6xl md:text-7xl font-black tracking-tighter leading-[0.9]">
                                {institute.name}
                            </h1>
                            <p className="text-cosmos-muted text-lg max-w-xl leading-relaxed">
                                A premier learning destination powered by the Cosmos Digital Ecosystem. Providing world-class education tools and student tracking.
                            </p>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-cosmos-muted bg-white/5 px-4 py-2 rounded-2xl border border-cosmos-border/40">
                                    <MapPin size={16} className="text-cosmos-primary" />
                                    {institute.address || 'Global Campus'}
                                </div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-cosmos-muted bg-white/5 px-4 py-2 rounded-2xl border border-cosmos-border/40">
                                    <Phone size={16} className="text-cosmos-primary" />
                                    {institute.contact_phone || 'Contact Support'}
                                </div>
                            </div>
                        </div>
                        <div className="w-72 h-72 md:w-96 md:h-96 rounded-[3rem] bg-gradient-to-br from-cosmos-primary/20 to-cosmos-peach/20 border border-white/10 relative flex items-center justify-center shadow-2xl">
                            <Building2 size={120} className="text-cosmos-primary/40 animate-pulse" />
                            <div className="absolute -bottom-6 -left-6 cosmos-card border-cosmos-primary/20 shadow-xl py-4 px-6 scale-90 md:scale-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-cosmos-green/20 flex items-center justify-center text-cosmos-green">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-cosmos-subtle">Verified Status</div>
                                        <div className="text-sm font-bold text-cosmos-green">Active Institution</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Area */}
            <section className="py-20 border-y border-cosmos-border/40 bg-cosmos-surface/30">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="text-5xl font-display font-black text-cosmos-primary">{stats.students}+</div>
                        <div className="text-xs font-black uppercase tracking-widest text-cosmos-muted">Students Enrolled</div>
                        <div className="text-[10px] text-cosmos-subtle">Real-time platform analytics</div>
                    </div>
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="text-5xl font-display font-black text-cosmos-cyan">{stats.batches}</div>
                        <div className="text-xs font-black uppercase tracking-widest text-cosmos-muted">Active Batches</div>
                        <div className="text-[10px] text-cosmos-subtle">Expert led learning paths</div>
                    </div>
                    <div className="flex flex-col items-center text-center space-y-2">
                        <div className="text-5xl font-display font-black text-cosmos-peach">AI</div>
                        <div className="text-xs font-black uppercase tracking-widest text-cosmos-muted">Digital Reports</div>
                        <div className="text-[10px] text-cosmos-subtle">Weekly performance summaries</div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-32">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="font-display text-4xl font-bold mb-4">Educational Excellence</h2>
                        <p className="text-cosmos-muted max-w-lg mx-auto">This institute utilizes the standard Cosmos B2B ecosystem for all academic management.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { title: 'Digital Attendance', desc: 'Automated check-in/out with parent notifications.', icon: Users },
                            { title: 'Smart Tests', desc: 'Subjective marks entry with concept-level tracking.', icon: GraduationCap },
                            { title: 'Homework Logs', desc: 'Centralized assignment hub with PDF attachments.', icon: BookOpen },
                            { title: 'Web Dashboards', desc: 'Premium admin portal for center management.', icon: Globe }
                        ].map((feat, i) => (
                            <div key={i} className="cosmos-card group hover:border-cosmos-primary transition-all p-8">
                                <div className="w-12 h-12 rounded-2xl bg-cosmos-primary/5 flex items-center justify-center text-cosmos-primary mb-6 group-hover:bg-cosmos-primary group-hover:text-white transition-all">
                                    <feat.icon size={24} />
                                </div>
                                <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
                                <p className="text-sm text-cosmos-muted leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 bg-cosmos-primary/10 border-t border-cosmos-primary/20">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
                    <div className="p-4 rounded-3xl bg-white w-20 h-20 mx-auto flex items-center justify-center shadow-xl">
                        <Building2 size={40} className="text-cosmos-primary" />
                    </div>
                    <h2 className="font-display text-5xl font-black tracking-tighter">Ready to join the {institute.name} community?</h2>
                    <p className="text-cosmos-muted text-lg">Contact the center directly to inquire about ongoing batches and enrollment availability.</p>
                    <div className="pt-8">
                         <button className="btn-primary group px-12 py-5 text-lg font-bold flex items-center gap-3 mx-auto shadow-glow-blue">
                            Contact Admission Office <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                         </button>
                    </div>
                </div>
            </section>

            <footer className="py-20 border-t border-cosmos-border/40 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg bg-cosmos-muted/20 flex items-center justify-center text-cosmos-muted">
                        <ShieldCheck size={14} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cosmos-muted">Cosmos Verified Institution</span>
                </div>
                <p className="text-xs text-cosmos-subtle">
                    &copy; {new Date().getFullYear()} {institute.name}. Powered by Cosmos B2B SaaS Ecosystem.
                </p>
            </footer>
        </div>
    )
}
