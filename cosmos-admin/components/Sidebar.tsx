'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, BookOpen, ClipboardList,
  CalendarCheck, GraduationCap, Tag, LogOut, Telescope, Menu, X, MessageSquare, CreditCard, Megaphone, Calendar, Users, Headphones, LifeBuoy, IndianRupee, Upload, Clock
} from 'lucide-react'
import { createClient } from '../lib/supabase'
import { useGlobalContext } from '../lib/GlobalContext'
import { toast } from 'react-hot-toast'

const navItems = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/institutes',    icon: Telescope,       label: 'Clinics / Centers', superOnly: true },
  { href: '/billing',       icon: IndianRupee,     label: 'Platform Billing',  superOnly: true },
  { href: '/support-inbox', icon: LifeBuoy,        label: 'Support Tickets',   superOnly: true },
  { href: '/inbox',       icon: MessageSquare,   label: 'Inbox' },
  { href: '/fees',        icon: CreditCard,      label: 'Fees / Payments' },
  { href: '/notices',     icon: Megaphone,       label: 'Notices Board' },
  { href: '/calendar',    icon: Calendar,        label: 'Calendar' },
  { href: '/timetable',   icon: Clock,           label: 'Timetable' },
  { href: '/batches',     icon: BookOpen,        label: 'Batches' },
  { href: '/teachers',    icon: Users,           label: 'Teachers & Access' },
  { href: '/students',    icon: GraduationCap,   label: 'Students' },
  { href: '/import',      icon: Upload,          label: 'Import Data' },
  { href: '/marks-entry', icon: ClipboardList,   label: 'Marks Entry' },
  { href: '/attendance',  icon: CalendarCheck,   label: 'Attendance' },
  { href: '/homework',    icon: BookOpen,        label: 'Homework' },
  { href: '/micro-tags',  icon: Tag,             label: 'Concept Tags' },
  { href: '/support',     icon: Headphones,      label: 'Help & Support' },
] 

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { role, institutes, currentInstitute, selectedInstituteId, setSelectedInstituteId, loading } = useGlobalContext()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredItems = navItems.filter(item => {
    if ((item as any).superOnly && role !== 'super_admin') return false;
    
    if (role === 'super_admin') {
      // Super Admin only needs platform-level features
      return ['/dashboard', '/institutes', '/billing', '/support-inbox'].includes(item.href);
    }
    
    if (role === 'teacher') {
      return !['/fees', '/batches', '/teachers', '/micro-tags', '/institutes'].includes(item.href)
    }
    
    return true
  })

  // --- Pending Support Ticket Count (Super Admin only) ---
  const [pendingTickets, setPendingTickets] = useState(0)
  const hasShownToast = useRef(false)
  const supabaseSidebar = createClient()

  useEffect(() => {
    if (role !== 'super_admin') return

    async function fetchPending() {
      const { count } = await supabaseSidebar
        .from('support_requests')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'resolved')
      const n = count || 0
      setPendingTickets(n)

      // Toast on first load if there are open tickets
      if (n > 0 && !hasShownToast.current) {
        hasShownToast.current = true
        toast(`🎫 ${n} open support ticket${n > 1 ? 's' : ''} need attention`, {
          duration: 5000,
          icon: '🔔',
          style: { borderLeft: '4px solid #DC2626' }
        })
      }
    }
    fetchPending()

    // Real-time: update badge when tickets change
    const channel = supabaseSidebar
      .channel('support_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests' }, () => {
        fetchPending()
      })
      .subscribe()

    return () => { supabaseSidebar.removeChannel(channel) }
  }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="md:hidden fixed top-4 left-4 z-[60] p-2.5 bg-white border border-cosmos-border rounded-xl text-cosmos-primary shadow-lg active:scale-95 transition-all"
      >
        <Menu size={20} />
      </button>

      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 z-[70] backdrop-blur-md transition-opacity duration-300" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-cosmos-border flex flex-col z-[80] transition-transform duration-500 ease-out shadow-2xl md:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="p-5 border-b border-cosmos-border">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cosmos-border animate-pulse" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 rounded bg-cosmos-border animate-pulse w-3/4" />
              <div className="h-3 rounded bg-cosmos-border animate-pulse w-1/2" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shadow-glow-blue rounded-xl overflow-hidden" 
                 style={{ background: 'color-mix(in srgb, var(--cosmos-primary) 10%, transparent)' }}>
              {currentInstitute?.logo_url ? (
                <img src={currentInstitute.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="font-black text-lg" style={{ color: 'var(--cosmos-primary)' }}>
                  {currentInstitute?.name?.[0] || role === 'super_admin' ? 'C' : ''}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-sm tracking-tight truncate" style={{ color: 'var(--cosmos-primary)' }}>
                {currentInstitute?.name || (role === 'super_admin' ? 'Cosmos Tutorials' : '')}
              </div>
              <div className="text-cosmos-muted text-[11px] mt-0.5 truncate">
                {role === 'super_admin' ? 'Master Portal' : 'Admin · Teacher Portal'}
              </div>
            </div>
          </div>
        )}
      </div>

      {role === 'super_admin' && (
        <div className="px-4 py-4 border-b border-cosmos-border bg-cosmos-primary/5">
           <label className="block text-[10px] font-black text-cosmos-primary uppercase tracking-widest mb-2">Center Switcher</label>
           <select 
            value={selectedInstituteId} 
            onChange={(e) => setSelectedInstituteId(e.target.value)}
            className="w-full bg-white border border-cosmos-border rounded-lg px-2 py-1.5 text-xs text-cosmos-text font-bold focus:outline-none focus:ring-1 focus:ring-cosmos-primary"
           >
              <option value="all">Platform Overview</option>
              {institutes.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
           </select>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {loading ? (
          // Skeleton placeholders while context loads — prevents flash of wrong nav items
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl">
              <div className="w-4 h-4 rounded bg-cosmos-border animate-pulse" />
              <div className="h-3 rounded bg-cosmos-border animate-pulse" style={{ width: `${60 + i * 15}px` }} />
            </div>
          ))
        ) : (
          filteredItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className={`nav-item ${pathname.startsWith(href) ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span className="text-sm font-medium flex-1">{label}</span>
              {href === '/support-inbox' && pendingTickets > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-black text-white px-1.5"
                      style={{ background: '#DC2626', boxShadow: '0 0 8px rgba(220,38,38,0.4)' }}>
                  {pendingTickets > 99 ? '99+' : pendingTickets}
                </span>
              )}
            </Link>
          ))
        )}
      </nav>

      <div className="p-4 border-t border-cosmos-border mt-auto">
        {!loading && role && (
          <div className="px-3 py-2 mb-3 flex items-center justify-between bg-cosmos-bg rounded-xl border border-cosmos-border/50">
            <div className="badge-blue text-[10px] py-0.5 px-2 font-black uppercase tracking-tighter">
              {role.replace('_', ' ')}
            </div>
            <div className="text-[10px] font-bold text-cosmos-muted uppercase tracking-tighter">
              Active
            </div>
          </div>
        )}
        <div className="px-3 py-1 mb-4 text-cosmos-muted text-[10px] uppercase tracking-widest font-black opacity-50">
          {currentInstitute?.tagline || 'Cosmos Platform'}
        </div>
        <button 
          onClick={handleSignOut}
          className="nav-item w-full text-cosmos-red hover:text-cosmos-red hover:bg-cosmos-red/10 border border-transparent hover:border-cosmos-red/20 py-2.5"
        >
          <LogOut size={15} />
          <span className="text-sm font-bold">Sign Out</span>
        </button>
      </div>
      </aside>
    </>
  )
}
