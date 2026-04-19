'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { LifeBuoy, Building2, Clock, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function SupportInboxPage() {
    const supabase = createClient()
    const [tickets, setTickets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const loadTickets = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('support_requests')
            .select(`
                *,
                institutes ( name )
            `)
            .order('created_at', { ascending: false })
        
        if (error) {
            toast.error(error.message)
        } else {
            setTickets(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadTickets()
    }, [])

    const resolveTicket = async (id: string) => {
        const { error } = await supabase
            .from('support_requests')
            .update({ status: 'resolved' })
            .eq('id', id)
        
        if (error) toast.error('Update failed')
        else {
            toast.success('Ticket marked as resolved')
            loadTickets()
        }
    }

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'emergency': return 'bg-cosmos-red text-white'
            case 'high': return 'bg-cosmos-orange/10 text-cosmos-orange border-cosmos-orange/20'
            case 'medium': return 'bg-cosmos-blue/10 text-cosmos-blue border-cosmos-blue/20'
            default: return 'bg-cosmos-cyan/10 text-cosmos-cyan border-cosmos-cyan/20'
        }
    }

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <span className="badge-primary">Technical Dashboard</span>
                        </div>
                        <h1 className="font-display text-3xl font-bold text-cosmos-text tracking-tight">Support Inbox</h1>
                        <p className="text-cosmos-muted text-sm mt-1">Manage technical assistance requests from institute admins.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-cosmos-primary" size={32} />
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="cosmos-card text-center py-24 opacity-60">
                        <LifeBuoy size={48} className="mx-auto mb-4 text-cosmos-muted" />
                        <p className="text-cosmos-text font-bold">No active support tickets.</p>
                        <p className="text-cosmos-muted text-sm mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-5xl">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className={`cosmos-card p-0 overflow-hidden border-l-[6px] ${ticket.status === 'resolved' ? 'border-l-cosmos-green/40' : ticket.priority === 'emergency' ? 'border-l-cosmos-red animate-pulse' : 'border-l-cosmos-primary'}`}>
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`badge ${getPriorityColor(ticket.priority)}`}>
                                                    {ticket.priority}
                                                </span>
                                                {ticket.status === 'resolved' && (
                                                    <span className="badge-green">
                                                        <CheckCircle2 size={10} className="mr-1" /> Resolved
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-display font-bold text-xl text-cosmos-text mb-2">{ticket.subject}</h3>
                                            <div className="flex flex-wrap items-center gap-4 text-cosmos-muted text-[11px] font-bold uppercase tracking-wider">
                                                <div className="flex items-center gap-1.5 text-cosmos-primary">
                                                    <Building2 size={14} /> {ticket.institutes?.name}
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-60">
                                                    <Clock size={14} /> {new Date(ticket.created_at).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="mt-5 p-5 bg-cosmos-bg border border-cosmos-border rounded-2xl text-sm text-cosmos-text leading-relaxed font-medium italic relative">
                                                <div className="absolute -top-3 left-4 px-2 bg-cosmos-bg text-[10px] font-black text-cosmos-subtle">ADMIN MESSAGE</div>
                                                "{ticket.message}"
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2 min-w-[150px]">
                                            {ticket.status !== 'resolved' ? (
                                                <button 
                                                    onClick={() => resolveTicket(ticket.id)}
                                                    className="btn-primary flex items-center justify-center gap-2 text-xs py-2"
                                                >
                                                    <CheckCircle2 size={14} /> Mark Resolved
                                                </button>
                                            ) : (
                                                <div className="text-center py-2 text-xs text-cosmos-green font-bold">Closed Ticket</div>
                                            )}
                                            <a 
                                                href={`mailto:admin@institute.com?subject=Re: Support Request: ${ticket.subject}`}
                                                className="btn-secondary flex items-center justify-center gap-2 text-xs py-2"
                                            >
                                                <Mail size={14} /> Contact Admin
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
