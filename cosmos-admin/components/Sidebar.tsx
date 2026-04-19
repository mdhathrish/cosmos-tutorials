'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, BookOpen, ClipboardList,
  CalendarCheck, GraduationCap, Tag, LogOut, Telescope, Menu, X, MessageSquare, CreditCard, Megaphone, Calendar, Users
} from 'lucide-react'
import { createClient } from '../lib/supabase'
import { useGlobalContext } from '../lib/GlobalContext'

const navItems = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/institutes',  icon: Telescope,       label: 'Clinics / Centers', superOnly: true },
  { href: '/inbox',       icon: MessageSquare,   label: 'Inbox' },
  { href: '/fees',        icon: CreditCard,      label: 'Fees / Payments' },
  { href: '/notices',     icon: Megaphone,       label: 'Notices Board' },
  { href: '/calendar',    icon: Calendar,        label: 'Calendar' },
  { href: '/batches',     icon: BookOpen,        label: 'Batches' },
  { href: '/teachers',    icon: Users,           label: 'Teachers & Access' },
  { href: '/students',    icon: GraduationCap,   label: 'Students' },
  { href: '/marks-entry', icon: ClipboardList,   label: 'Marks Entry' },
  { href: '/attendance',  icon: CalendarCheck,   label: 'Attendance' },
  { href: '/homework',    icon: BookOpen,        label: 'Homework' },
  { href: '/micro-tags',  icon: Tag,             label: 'Concept Tags' },
] 

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { role, institutes, selectedInstituteId, setSelectedInstituteId, loading } = useGlobalContext()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredItems = navItems.filter(item => {
    if ((item as any).superOnly && role !== 'super_admin') return false;
    if (role === 'teacher') {
      return !['/fees', '/batches', '/teachers', '/micro-tags', '/institutes'].includes(item.href)
    }
    return true
  })

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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shadow-glow-blue rounded-xl overflow-hidden">
            <Image src="/logo.png" alt="Cosmos Logo" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-display font-bold text-cosmos-primary text-sm tracking-tight">
              Cosmos Tutorials
            </div>
            <div className="text-cosmos-muted text-[11px] mt-0.5">Admin · Teacher Portal</div>
          </div>
        </div>
      </div>

      {role === 'super_admin' && (
        <div className="px-4 py-4 border-b border-cosmos-border bg-cosmos-primary/5">
           <label className="block text-[10px] font-black text-cosmos-primary uppercase tracking-widest mb-2">Master Scope</label>
           <select 
            value={selectedInstituteId} 
            onChange={(e) => setSelectedInstituteId(e.target.value)}
            className="w-full bg-white border border-cosmos-border rounded-lg px-2 py-1.5 text-xs text-cosmos-text font-bold focus:outline-none focus:ring-1 focus:ring-cosmos-primary"
           >
              <option value="all">All Institutes</option>
              {institutes.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
           </select>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filteredItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setIsOpen(false)}
            className={`nav-item ${pathname.startsWith(href) ? 'active' : ''}`}
          >
            <Icon size={15} />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-cosmos-border">
        {role && (
          <div className="px-3 py-2 mb-2 flex items-center justify-between">
            <div className="badge-blue text-[10px] py-0.5 px-2 font-black uppercase tracking-tighter">
              {role.replace('_', ' ')}
            </div>
          </div>
        )}
        <div className="px-3 py-2 mb-2 text-cosmos-muted text-[10px] uppercase tracking-widest font-bold">
          IIT Foundation
        </div>
        <button 
          onClick={handleSignOut}
          className="nav-item w-full text-cosmos-red hover:text-cosmos-red hover:bg-cosmos-red/10"
        >
          <LogOut size={15} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
      </aside>
    </>
  )
}
