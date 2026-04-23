'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { IndianRupee, Plus, Loader2, Building2, CheckCircle, AlertTriangle, TrendingUp, Zap, Crown, Rocket, Gift, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGlobalContext } from '@/lib/GlobalContext'
import { useRouter } from 'next/navigation'

interface Plan {
  id: string
  name: string
  per_student_rate: number
  min_monthly: number
  max_students: number
  max_batches: number
  features: { whatsapp?: boolean; biometric?: boolean; data_import?: boolean; report_cards?: boolean; trial_days?: number }
}

interface Subscription {
  id: string
  institute_id: string
  plan_id: string
  billing_start_date: string
  trial_end_date: string | null
  onboarding_fee_paid: boolean
  is_active: boolean
  institutes: { name: string; is_active: boolean }
  platform_plans: Plan
}

interface Payment {
  id: string
  institute_id: string
  amount: number
  payment_date: string
  months_covered: number
  covers_from: string
  covers_to: string
  payment_method: string
  notes: string | null
}

type BillingStatus = 'paid' | 'due' | 'overdue' | 'advance' | 'free'

const planIcons: { [key: string]: any } = { free: Gift, starter: Zap, growth: Rocket, scale: Crown }
const planColors: { [key: string]: string } = {
  free: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  starter: 'text-cosmos-blue bg-cosmos-blue/10 border-cosmos-blue/20',
  growth: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  scale: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
}

export default function BillingPage() {
  const supabase = createClient()
  const { role } = useGlobalContext()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subs, setSubs] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [studentCounts, setStudentCounts] = useState<{ [instId: string]: number }>({})
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInstitute, setSelectedInstitute] = useState<{ id: string; name: string; estimated: number } | null>(null)
  const [showPlanModal, setShowPlanModal] = useState<{ subId: string; instituteId: string; currentPlan: string } | null>(null)

  useEffect(() => {
    if (role && role !== 'super_admin') { router.push('/dashboard'); return }
    loadData()
  }, [role])

  async function loadData() {
    setLoading(true)
    const [{ data: planData }, { data: subData }, { data: payData }] = await Promise.all([
      supabase.from('platform_plans').select('*').eq('is_active', true).order('per_student_rate'),
      supabase.from('platform_subscriptions').select('*, institutes(name, is_active), platform_plans(*)').eq('is_active', true),
      supabase.from('platform_payments').select('*').order('payment_date', { ascending: false })
    ])
    setPlans(planData || [])
    setSubs(subData || [])
    setPayments(payData || [])

    // Get student counts per institute
    if (subData && subData.length > 0) {
      const instIds = subData.map((s: any) => s.institute_id)
      const { data: students } = await supabase
        .from('students')
        .select('institute_id')
        .eq('is_active', true)
        .in('institute_id', instIds)
      
      const counts: { [id: string]: number } = {}
      instIds.forEach((id: string) => { counts[id] = 0 })
      students?.forEach(s => { counts[s.institute_id] = (counts[s.institute_id] || 0) + 1 })
      setStudentCounts(counts)
    }
    setLoading(false)
  }

  const currentMonth = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  function getEstimatedBill(sub: Subscription): number {
    const plan = sub.platform_plans
    if (!plan || plan.id === 'free') return 0
    const count = studentCounts[sub.institute_id] || 0
    return Math.max(plan.min_monthly, count * plan.per_student_rate)
  }

  function getInstituteStatus(sub: Subscription): { status: BillingStatus; paidThrough: string; label: string } {
    if (sub.plan_id === 'free') {
      const trialEnd = sub.trial_end_date
      if (trialEnd && new Date(trialEnd) > new Date()) {
        const days = Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return { status: 'free', paidThrough: '—', label: `Trial: ${days}d left` }
      }
      return { status: 'free', paidThrough: '—', label: 'Free Tier' }
    }

    const instPayments = payments.filter(p => p.institute_id === sub.institute_id).sort((a, b) => b.covers_to.localeCompare(a.covers_to))
    if (instPayments.length === 0) return { status: 'overdue', paidThrough: 'Never', label: 'Never Paid' }
    const latest = instPayments[0].covers_to
    if (latest > currentMonth) return { status: 'advance', paidThrough: latest, label: `Paid through ${latest}` }
    if (latest === currentMonth) return { status: 'paid', paidThrough: latest, label: 'Current' }
    return { status: 'overdue', paidThrough: latest, label: `Overdue since ${latest}` }
  }

  // Dashboard stats
  const totalMRR = subs.reduce((sum, s) => sum + getEstimatedBill(s), 0)
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
  const overdueCount = subs.filter(s => getInstituteStatus(s).status === 'overdue').length
  const freeCount = subs.filter(s => s.plan_id === 'free').length
  const totalStudents = Object.values(studentCounts).reduce((a, b) => a + b, 0)

  const statusColors: Record<BillingStatus, string> = {
    paid: 'bg-cosmos-green/10 text-cosmos-green border-cosmos-green/20',
    due: 'bg-cosmos-gold/10 text-cosmos-gold border-cosmos-gold/20',
    overdue: 'bg-cosmos-red/10 text-cosmos-red border-cosmos-red/20',
    advance: 'bg-cosmos-blue/10 text-cosmos-blue border-cosmos-blue/20',
    free: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }

  const handleChangePlan = async (subId: string, newPlanId: string) => {
    const updates: any = { plan_id: newPlanId }
    // If upgrading from free, set trial end date for Growth features
    if (newPlanId === 'free') {
      updates.trial_end_date = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
    const { error } = await supabase.from('platform_subscriptions').update(updates).eq('id', subId)
    if (error) { toast.error(error.message); return }
    toast.success('Plan updated!')
    setShowPlanModal(null)
    loadData()
  }

  if (role !== 'super_admin') return null

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-cosmos-text tracking-tight">Platform Billing</h1>
          <p className="text-cosmos-muted text-sm mt-1">Per-student pricing · Free tier · Subscription management</p>
        </div>

        {/* Plan Tiers */}
        {plans.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {plans.map(plan => {
              const Icon = planIcons[plan.id] || Zap
              const color = planColors[plan.id] || planColors.starter
              const subCount = subs.filter(s => s.plan_id === plan.id).length
              return (
                <div key={plan.id} className={`cosmos-card border-2 ${color.split(' ')[2]} relative`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}><Icon size={14} /></div>
                    <span className="font-display font-bold text-cosmos-text text-sm">{plan.name}</span>
                  </div>
                  {plan.id === 'free' ? (
                    <div className="text-2xl font-black text-cosmos-text">FREE</div>
                  ) : (
                    <div className="text-2xl font-black text-cosmos-text">₹{plan.per_student_rate}<span className="text-xs font-normal text-cosmos-muted">/student/mo</span></div>
                  )}
                  <div className="text-[10px] text-cosmos-muted mt-2 space-y-0.5">
                    {plan.min_monthly > 0 && <div>Min ₹{plan.min_monthly.toLocaleString('en-IN')}/mo</div>}
                    <div>Up to {plan.max_students} students · {plan.max_batches} batches</div>
                    <div>{plan.features.whatsapp ? '✅' : '❌'} WhatsApp · {plan.features.biometric ? '✅' : '❌'} Biometric</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-cosmos-border">
                    <span className="text-[10px] font-bold text-cosmos-muted">{subCount} institutes</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <div className="cosmos-card bg-cosmos-primary/5 border-cosmos-primary/20">
            <div className="flex items-center gap-1 mb-1"><TrendingUp size={14} className="text-cosmos-primary" /><span className="text-[9px] uppercase font-bold text-cosmos-muted tracking-widest">Est. MRR</span></div>
            <div className="text-xl font-black text-cosmos-primary">₹{totalMRR.toLocaleString('en-IN')}</div>
          </div>
          <div className="cosmos-card bg-cosmos-green/5 border-cosmos-green/20">
            <div className="flex items-center gap-1 mb-1"><IndianRupee size={14} className="text-cosmos-green" /><span className="text-[9px] uppercase font-bold text-cosmos-muted tracking-widest">Collected</span></div>
            <div className="text-xl font-black text-cosmos-green">₹{totalCollected.toLocaleString('en-IN')}</div>
          </div>
          <div className="cosmos-card bg-purple-500/5 border-purple-500/20">
            <div className="flex items-center gap-1 mb-1"><Users size={14} className="text-purple-500" /><span className="text-[9px] uppercase font-bold text-cosmos-muted tracking-widest">Students</span></div>
            <div className="text-xl font-black text-purple-500">{totalStudents}</div>
          </div>
          <div className="cosmos-card bg-cosmos-red/5 border-cosmos-red/20">
            <div className="flex items-center gap-1 mb-1"><AlertTriangle size={14} className="text-cosmos-red" /><span className="text-[9px] uppercase font-bold text-cosmos-muted tracking-widest">Overdue</span></div>
            <div className="text-xl font-black text-cosmos-red">{overdueCount}</div>
          </div>
          <div className="cosmos-card bg-gray-500/5 border-gray-500/20">
            <div className="flex items-center gap-1 mb-1"><Gift size={14} className="text-gray-400" /><span className="text-[9px] uppercase font-bold text-cosmos-muted tracking-widest">Free Tier</span></div>
            <div className="text-xl font-black text-gray-400">{freeCount}</div>
          </div>
        </div>

        {/* Institute Table */}
        {loading ? (
          <div className="cosmos-card flex items-center justify-center py-16"><Loader2 size={28} className="text-cosmos-primary animate-spin" /></div>
        ) : subs.length === 0 ? (
          <div className="cosmos-card text-center py-16 text-cosmos-muted">No subscriptions found.</div>
        ) : (
          <div className="cosmos-card p-0 overflow-x-auto">
            <table className="cosmos-table min-w-[1000px]">
              <thead>
                <tr><th>Institute</th><th className="text-center">Plan</th><th className="text-center">Students</th><th className="text-right">Est. Bill</th><th className="text-center">Status</th><th className="text-center">Actions</th></tr>
              </thead>
              <tbody>
                {subs.map(sub => {
                  const { status, label } = getInstituteStatus(sub)
                  const Icon = planIcons[sub.plan_id] || Zap
                  const count = studentCounts[sub.institute_id] || 0
                  const bill = getEstimatedBill(sub)
                  return (
                    <tr key={sub.id}>
                      <td><div className="flex items-center gap-2"><Building2 size={16} className="text-cosmos-muted" /><span className="font-medium text-cosmos-text">{sub.institutes?.name || 'Unknown'}</span></div></td>
                      <td className="text-center">
                        <button onClick={() => setShowPlanModal({ subId: sub.id, instituteId: sub.institute_id, currentPlan: sub.plan_id })} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase border cursor-pointer hover:opacity-80 transition ${planColors[sub.plan_id] || planColors.starter}`}>
                          <Icon size={10} /> {sub.platform_plans?.name || sub.plan_id}
                        </button>
                      </td>
                      <td className="text-center font-mono font-bold text-cosmos-text">{count}</td>
                      <td className="text-right font-mono font-bold text-cosmos-text">
                        {bill > 0 ? `₹${bill.toLocaleString('en-IN')}` : <span className="text-gray-400">FREE</span>}
                        {bill > 0 && sub.platform_plans?.per_student_rate > 0 && (
                          <div className="text-[9px] text-cosmos-muted font-normal">{count} × ₹{sub.platform_plans.per_student_rate}</div>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColors[status]}`}>
                          {status === 'overdue' && <AlertTriangle size={10} />}
                          {status === 'paid' && <CheckCircle size={10} />}
                          {status === 'advance' && <TrendingUp size={10} />}
                          {status === 'free' && <Gift size={10} />}
                          {label}
                        </span>
                      </td>
                      <td className="text-center">
                        {sub.plan_id !== 'free' && (
                          <button onClick={() => { setSelectedInstitute({ id: sub.institute_id, name: sub.institutes?.name || '', estimated: bill }); setShowPaymentModal(true) }} className="btn-primary text-xs py-1.5 px-3">
                            <Plus size={12} className="inline mr-1" /> Record
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Payments */}
        {payments.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display font-bold text-xl text-cosmos-text mb-4">Recent Payments</h2>
            <div className="cosmos-card p-0 overflow-x-auto">
              <table className="cosmos-table min-w-[700px]">
                <thead><tr><th>Date</th><th>Institute</th><th className="text-right">Amount</th><th className="text-center">Months</th><th className="text-center">Coverage</th><th>Method</th></tr></thead>
                <tbody>
                  {payments.slice(0, 15).map(p => {
                    const instName = subs.find(s => s.institute_id === p.institute_id)?.institutes?.name || '—'
                    return (
                      <tr key={p.id}>
                        <td className="font-mono text-sm">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                        <td className="font-medium">{instName}</td>
                        <td className="text-right font-mono font-bold text-cosmos-green">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="text-center">{p.months_covered}</td>
                        <td className="text-center text-xs text-cosmos-muted">{p.covers_from} → {p.covers_to}</td>
                        <td className="text-xs uppercase text-cosmos-muted">{p.payment_method}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Change Plan Modal */}
        {showPlanModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-2xl">
              <div className="p-6 border-b border-cosmos-border flex items-center justify-between">
                <h2 className="font-display font-bold">Change Plan</h2>
                <button onClick={() => setShowPlanModal(null)} className="text-cosmos-muted hover:text-cosmos-text text-xl">✕</button>
              </div>
              <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {plans.map(plan => {
                  const Icon = planIcons[plan.id] || Zap
                  const isActive = showPlanModal.currentPlan === plan.id
                  const count = studentCounts[showPlanModal.instituteId] || 0
                  const estimated = plan.id === 'free' ? 0 : Math.max(plan.min_monthly, count * plan.per_student_rate)
                  return (
                    <button key={plan.id} onClick={() => handleChangePlan(showPlanModal.subId, plan.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${isActive ? 'border-cosmos-primary bg-cosmos-primary/5' : 'border-cosmos-border hover:border-cosmos-primary/50'}`}>
                      <Icon size={20} className={`mb-2 ${isActive ? 'text-cosmos-primary' : 'text-cosmos-muted'}`} />
                      <div className="font-bold text-sm text-cosmos-text">{plan.name}</div>
                      {plan.id === 'free' ? (
                        <div className="text-lg font-black text-cosmos-primary mt-1">FREE</div>
                      ) : (
                        <>
                          <div className="text-lg font-black text-cosmos-primary mt-1">₹{plan.per_student_rate}<span className="text-[10px] font-normal">/student</span></div>
                          <div className="text-[10px] text-cosmos-muted">Est: ₹{estimated.toLocaleString('en-IN')}/mo</div>
                        </>
                      )}
                      <div className="text-[10px] text-cosmos-muted mt-1">{plan.max_students} students max</div>
                      {isActive && <div className="text-[10px] font-bold text-cosmos-primary mt-2">CURRENT</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedInstitute && (
          <PaymentModal
            institute={selectedInstitute}
            onClose={() => setShowPaymentModal(false)}
            onSaved={() => { loadData(); setShowPaymentModal(false) }}
          />
        )}
      </main>
    </div>
  )
}

function PaymentModal({ institute, onClose, onSaved }: { institute: { id: string; name: string; estimated: number }; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [form, setForm] = useState({
    amount: institute.estimated ? String(institute.estimated) : '',
    months_covered: 1,
    covers_from: currentMonth,
    payment_method: 'bank_transfer',
    notes: ''
  })

  const coversTo = (() => {
    const [year, month] = form.covers_from.split('-').map(Number)
    const endDate = new Date(year, month - 1 + form.months_covered, 1)
    return `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`
  })()

  useEffect(() => {
    if (institute.estimated) {
      setForm(prev => ({ ...prev, amount: String(institute.estimated * prev.months_covered) }))
    }
  }, [form.months_covered])

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    const { error } = await supabase.from('platform_payments').insert({
      institute_id: institute.id,
      amount: Number(form.amount),
      payment_date: new Date().toISOString().split('T')[0],
      months_covered: form.months_covered,
      covers_from: form.covers_from,
      covers_to: coversTo,
      payment_method: form.payment_method,
      notes: form.notes || null
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Payment recorded!')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-cosmos-card border border-cosmos-border rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-cosmos-border">
          <h2 className="font-display font-bold text-cosmos-text">Record Payment — {institute.name}</h2>
          {institute.estimated > 0 && <p className="text-xs text-cosmos-muted mt-1">Estimated bill: ₹{institute.estimated.toLocaleString('en-IN')}/mo</p>}
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase">Amount (₹)</label>
            <input type="number" className="cosmos-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase">Months Covered</label>
              <input type="number" min={1} max={24} className="cosmos-input" value={form.months_covered} onChange={e => setForm({ ...form, months_covered: Math.max(1, parseInt(e.target.value) || 1) })} />
            </div>
            <div>
              <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase">Starting From</label>
              <input type="month" className="cosmos-input" value={form.covers_from} onChange={e => setForm({ ...form, covers_from: e.target.value })} />
            </div>
          </div>
          <div className="text-xs text-cosmos-muted bg-cosmos-surface p-3 rounded-xl border border-cosmos-border">
            Coverage: <strong className="text-cosmos-text">{form.covers_from}</strong> → <strong className="text-cosmos-primary">{coversTo}</strong> ({form.months_covered} month{form.months_covered > 1 ? 's' : ''})
          </div>
          <div>
            <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase">Payment Method</label>
            <select className="cosmos-input" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-cosmos-muted mb-1 font-bold uppercase">Notes</label>
            <input className="cosmos-input" placeholder="e.g. Advance for Q3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="p-6 border-t border-cosmos-border flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <IndianRupee size={14} />} Save
          </button>
        </div>
      </div>
    </div>
  )
}
