'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, BookOpen, ClipboardList,
  CalendarCheck, GraduationCap, Tag, LogOut, Telescope, Menu, X
} from 'lucide-react'
import { createClient } from '../lib/supabase'


const navItems = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/batches',     icon: BookOpen,        label: 'Batches' },
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

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="md:hidden fixed top-4 right-4 z-40 p-2 bg-cosmos-card border border-cosmos-border rounded-lg text-cosmos-text shadow-sm">
        <Menu size={20} />
      </button>

      {isOpen && <div className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />}

      <aside className={`fixed left-0 top-0 h-screen w-60 bg-cosmos-surface border-r border-cosmos-border flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      {/* Brand */}
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

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => (
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

      {/* Footer */}
      <div className="p-3 border-t border-cosmos-border">
        <div className="px-3 py-2 mb-2">
          <div className="text-[10px] text-cosmos-subtle uppercase tracking-widest">IIT Foundation</div>
          <div className="text-xs text-cosmos-muted">Grades 8–12 · Hyderabad</div>
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

