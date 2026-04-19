'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Headphones, Phone, Mail, Send, CheckCircle, ShieldAlert, Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useGlobalContext } from '@/lib/GlobalContext'

export default function SupportPage() {
    const supabase = createClient()
    const { selectedInstituteId } = useGlobalContext()
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [form, setForm] = useState({ subject: '', message: '', priority: 'medium' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error } = await supabase
            .from('support_requests')
            .insert({
                user_id: user?.id,
                subject: form.subject,
                message: form.message,
                priority: form.priority,
                institute_id: selectedInstituteId !== 'all' ? selectedInstituteId : null
            })

        if (error) {
            toast.error(error.message)
        } else {
            setSubmitted(true)
            toast.success('Support request sent!')
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
                
                <div className="max-w-4xl mx-auto">
                    <div className="mb-10">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="badge-blue text-[10px] py-0.5 px-2 font-black uppercase tracking-tighter">TECHNICAL HELPDESK</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-cosmos-green animate-pulse" />
                        </div>
                        <h1 className="font-display text-4xl font-bold text-cosmos-text tracking-tighter">Help & Support</h1>
                        <p className="text-cosmos-muted mt-2">Need assistance with your institute instance? We're here to help.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Contact Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="cosmos-card bg-cosmos-primary/5 border-cosmos-primary/20 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-lg bg-cosmos-primary/10 text-cosmos-primary">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <h3 className="font-display font-bold text-cosmos-text">Emergency Contact</h3>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Phone size={16} className="text-cosmos-primary mt-1" />
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest font-black text-cosmos-subtle">Call / WhatsApp</p>
                                            <p className="font-bold text-cosmos-text">+91 99999 88888</p>
                                            <p className="text-[10px] text-cosmos-muted">9am - 9pm Technical Support</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <Mail size={16} className="text-cosmos-primary mt-1" />
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest font-black text-cosmos-subtle">Official Email</p>
                                            <p className="font-bold text-cosmos-text">support@cosmostutorials.com</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="cosmos-card p-6">
                                <h3 className="font-display font-bold text-sm text-cosmos-text mb-4">Common Topics</h3>
                                <ul className="space-y-3">
                                    {['System Downtime', 'Data Migration', 'Staff Onboarding', 'Payment Issues'].map(topic => (
                                        <li key={topic} className="flex items-center gap-2 text-xs text-cosmos-muted hover:text-cosmos-primary cursor-pointer transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cosmos-border" />
                                            {topic}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Right: Support Form */}
                        <div className="lg:col-span-2">
                            {submitted ? (
                                <div className="cosmos-card py-20 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
                                    <div className="w-16 h-16 rounded-full bg-cosmos-green/10 text-cosmos-green flex items-center justify-center mb-6">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h2 className="font-display text-2xl font-bold text-cosmos-text mb-2">Request Submitted!</h2>
                                    <p className="text-cosmos-muted max-w-sm">Our technical team has been notified. You will receive an update via email or phone shortly.</p>
                                    <button 
                                        onClick={() => { setSubmitted(false); setForm({ subject: '', message: '', priority: 'medium' }) }}
                                        className="mt-8 text-cosmos-primary font-bold text-sm hover:underline"
                                    >
                                        Send another request
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="cosmos-card p-8 shadow-xl border-t-4 border-cosmos-primary">
                                    <div className="flex items-center gap-3 mb-8">
                                        <MessageCircle className="text-cosmos-primary" size={24} />
                                        <h2 className="font-display font-bold text-xl text-cosmos-text">Submit a Ticket</h2>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Subject</label>
                                                <input required className="cosmos-input" placeholder="E.g. Error in Marks Entry" 
                                                    value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Priority Level</label>
                                                <select className="cosmos-input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                                    <option value="low">Low (General Query)</option>
                                                    <option value="medium">Medium (Functionality Issue)</option>
                                                    <option value="high">High (Urgent Help)</option>
                                                    <option value="emergency">🚨 Emergency (System Down)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-cosmos-subtle uppercase tracking-wider">Describe your issue</label>
                                            <textarea required rows={5} className="cosmos-input pt-3" placeholder="Tell us what's happening..."
                                                value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
                                        </div>

                                        <div className="pt-4">
                                            <button disabled={loading} type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-lg hover:shadow-cosmos-primary/20">
                                                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                                    <>
                                                        <Send size={18} />
                                                        Submit Technical Request
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-[10px] text-center text-cosmos-muted mt-4">
                                                By submitting, your institute profile and current user details will be shared with the support team.
                                            </p>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
