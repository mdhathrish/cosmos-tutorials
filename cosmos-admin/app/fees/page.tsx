'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Check, X, Eye, Loader2, Search, Filter } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface FeeRecord {
  id: string
  student_id: string
  fee_month: string
  amount: number
  status: 'pending' | 'submitted' | 'verified' | 'rejected'
  receipt_url: string | null
  submitted_at: string | null
  students: {
    full_name: string
  }
}

import { useGlobalContext } from '@/lib/GlobalContext'

export default function FeesDashboard() {
  const supabase = createClient()
  const { selectedInstituteId, role } = useGlobalContext()
  const [records, setRecords] = useState<FeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('submitted') // Default to submitted for review
  const [search, setSearch] = useState('')
  
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [upiId, setUpiId] = useState('')
  const [payeeName, setPayeeName] = useState('')
  const [updatingUpi, setUpdatingUpi] = useState(false)

  useEffect(() => {
    loadRecords()
    // Load config
    let sQuery = supabase.from('app_settings').select('*').in('key', ['upi_id', 'upi_payee_name'])
    if (selectedInstituteId !== 'all') {
        sQuery = sQuery.eq('institute_id', selectedInstituteId)
    }
    sQuery.then(({ data }) => {
      if (data) {
        const id = data.find(d => d.key === 'upi_id')?.value
        const name = data.find(d => d.key === 'upi_payee_name')?.value
        setUpiId(id || '')
        setPayeeName(name || '')
      }
    })
  }, [filterStatus, selectedInstituteId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRecords() {
    setLoading(true)
    let query = supabase
      .from('fee_records')
      .select(`
        *,
        students ( full_name, institute_id )
      `)
      .order('submitted_at', { ascending: false })

    if (selectedInstituteId !== 'all') {
        query = query.eq('institute_id', selectedInstituteId)
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query
    if (!error && data) setRecords(data as any)
    setLoading(false)
  }

  const handleUpdateStatus = async (id: string, newStatus: 'verified' | 'rejected') => {
    setActioning(id)
    const { error } = await supabase
      .from('fee_records')
      .update({ 
        status: newStatus,
        verified_at: newStatus === 'verified' ? new Date().toISOString() : null
      })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Payment mark as ${newStatus}`)
      loadRecords() // Refresh
    }
    setActioning(null)
  }

  const handleUpdateUpi = async () => {
    if (!upiId.trim()) return
    setUpdatingUpi(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('institute_id').eq('auth_id', user?.id).single()
    const targetInstId = userData?.institute_id

    const { error } = await supabase
      .from('app_settings')
      .upsert([
        { key: 'upi_id', value: upiId.trim(), institute_id: targetInstId },
        { key: 'upi_payee_name', value: payeeName.trim(), institute_id: targetInstId }
      ], { onConflict: 'key,institute_id' })
    if (error) toast.error('Failed to update settings')
    else toast.success('Payment settings updated!')
    setUpdatingUpi(false)
  }

  const filteredRecords = records.filter(r => 
    r.students?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-cosmos-green/10 text-cosmos-green border-cosmos-green/20'
      case 'submitted': return 'bg-cosmos-orange/10 text-cosmos-orange border-cosmos-orange/20'
      case 'rejected': return 'bg-cosmos-red/10 text-cosmos-red border-cosmos-red/20'
      default: return 'bg-slate-100 text-slate-500'
    }
  }

  // Get full storage URL for the screenshot path
  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from('payment_receipts').getPublicUrl(path)
    return data.publicUrl
  }

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
        
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-cosmos-text">Receipt Verification</h1>
            <p className="text-cosmos-muted text-sm mt-1">Review student fee submissions and screenshots.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cosmos-muted" />
              <input
                type="text"
                className="cosmos-input pl-9 text-xs"
                placeholder="Search student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="cosmos-input text-xs w-36"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Dynamic UPI ID Settings */}
        <div className="cosmos-card bg-cosmos-surface border-cosmos-border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 mb-6">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-cosmos-text">Payment Gateway Configuration</h3>
            <p className="text-xs text-cosmos-muted mt-0.5">Configure the destination for in-app UPI payments.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-64">
              <label className="text-[10px] text-cosmos-muted block mb-1">UPI ID (e.g. cosmos@oksbi)</label>
              <input 
                type="text" 
                className="cosmos-input text-xs w-full" 
                placeholder="UPI ID" 
                value={upiId} 
                onChange={e => setUpiId(e.target.value)} 
              />
            </div>
            <div className="w-full sm:w-64">
              <label className="text-[10px] text-cosmos-muted block mb-1">Payee Name (Optional)</label>
              <input 
                type="text" 
                className="cosmos-input text-xs w-full" 
                placeholder="Leave blank to use legal bank name" 
                value={payeeName} 
                onChange={e => setPayeeName(e.target.value)} 
              />
            </div>
            <button onClick={handleUpdateUpi} disabled={updatingUpi} className="btn-primary text-xs py-2 px-6 mt-4 sm:mt-0 self-end sm:self-center">
              {updatingUpi ? '...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-cosmos-primary" /></div>
        ) : filteredRecords.length === 0 ? (
          <div className="cosmos-card text-center py-12 text-cosmos-muted">No records found for filter.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRecords.map((rec) => (
              <div key={rec.id} className="cosmos-card border border-cosmos-border/60 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-cosmos-text">{rec.students?.full_name}</h3>
                    <p className="text-xs text-cosmos-muted">{rec.fee_month} • ₹{rec.amount}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadge(rec.status)}`}>
                    {rec.status.toUpperCase()}
                  </span>
                </div>

                {rec.submitted_at && (
                  <p className="text-[10px] text-cosmos-muted mb-3">
                    Submitted: {new Date(rec.submitted_at).toLocaleDateString('en-IN')}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cosmos-border/30">
                  {rec.receipt_url && (
                    <button 
                      onClick={() => rec.receipt_url && setSelectedReceipt(getImageUrl(rec.receipt_url))}
                      className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3"
                    >
                      <Eye size={12} /> View Receipt
                    </button>
                  )}
                  
                  {(rec.status === 'submitted' || rec.status === 'pending') && (
                    <div className="ml-auto flex items-center gap-2">
                       {rec.status === 'submitted' && (
                         <button 
                           onClick={() => handleUpdateStatus(rec.id, 'rejected')}
                           disabled={actioning === rec.id}
                           className="p-1.5 rounded-md hover:bg-cosmos-red/10 text-cosmos-red"
                           title="Reject"
                         >
                           {actioning === rec.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                         </button>
                       )}
                       <button 
                         onClick={() => handleUpdateStatus(rec.id, 'verified')}
                         disabled={actioning === rec.id}
                         className="p-1.5 rounded-md hover:bg-cosmos-green/10 text-cosmos-green"
                         title="Approve (Mark Paid)"
                       >
                         {actioning === rec.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                       </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Receipt Image Modal */}
        {selectedReceipt && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-4 max-w-lg w-full relative flex flex-col items-center">
              <button onClick={() => setSelectedReceipt(null)} className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full">
                <X size={20} className="text-slate-500" />
              </button>
              <h4 className="font-bold text-sm mb-4">Receipt Screenshot</h4>
              <img src={selectedReceipt} alt="Receipt" className="max-h-[70vh] rounded-lg object-contain w-full" />
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
