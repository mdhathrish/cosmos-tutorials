'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

import { getThemeById } from '@/lib/themes'

interface GlobalContextType {
    selectedInstituteId: string // 'all' or UUID
    setSelectedInstituteId: (id: string) => void
    role: string
    institutes: any[]
    currentInstitute: any | null
    loading: boolean
    refreshInstitutes: () => Promise<void>
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined)

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    const [selectedInstituteId, _setSelectedInstituteId] = useState('all')
    const setSelectedInstituteId = (id: string) => {
        localStorage.setItem('cosmos_selected_institute', id)
        _setSelectedInstituteId(id)
    }
    const [role, setRole] = useState('')
    const [institutes, setInstitutes] = useState<any[]>([])
    const [currentInstitute, setCurrentInstitute] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function init() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                // No user — reset everything to defaults
                setRole('')
                setInstitutes([])
                setCurrentInstitute(null)
                setSelectedInstituteId('all')
                setLoading(false)
                return
            }

            // Get Role
            const { data: userData } = await supabase
                .from('users')
                .select('role, institute_id')
                .eq('auth_id', user.id)
                .single()

            if (userData) {
                setRole(userData.role)
                
                // If super_admin, fetch all institutes for the switcher
                if (userData.role === 'super_admin') {
                    const saved = localStorage.getItem('cosmos_selected_institute')
                    setSelectedInstituteId(saved || 'all')
                    const { data: insts } = await supabase
                        .from('institutes')
                        .select('*')
                        .eq('is_deleted', false)
                        .order('name')
                    setInstitutes(insts || [])
                } else {
                    setSelectedInstituteId(userData.institute_id)
                    // Fetch the specific institute for branding/context
                    const { data: inst } = await supabase
                        .from('institutes')
                        .select('*')
                        .eq('id', userData.institute_id)
                        .single()
                    if (inst) {
                        if (!inst.is_active && userData.role !== 'super_admin') {
                            await supabase.auth.signOut()
                            window.location.href = '/login?error=suspended'
                            return
                        }
                        setInstitutes([inst])
                    }
                }
            } else {
                setRole('')
                setInstitutes([])
            }
            setLoading(false)
        }

        // Run on mount
        init()

        // Re-run when auth state changes (sign in / sign out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                // Immediately clear stale state
                setRole('')
                setInstitutes([])
                setCurrentInstitute(null)
                setSelectedInstituteId('all')
                setLoading(false)
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                // Re-initialize with new user's data
                init()
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Refresh institutes list (call after editing institute details/theme)
    const refreshInstitutes = async () => {
        const { data: insts } = await supabase
            .from('institutes')
            .select('*')
            .eq('is_deleted', false)
            .order('name')
        if (insts) setInstitutes(insts)
    }

    // Apply Theme Dynamically
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const activeInst = selectedInstituteId === 'all' 
            ? null 
            : institutes.find(i => i.id === selectedInstituteId);
        
        setCurrentInstitute(activeInst);

        const theme = getThemeById(activeInst?.theme_id || 'cosmos-classic');
        
        // Inject CSS variables safely
        try {
            const root = document.documentElement;
            if (root) {
                root.style.setProperty('--cosmos-primary', theme.primary || '#6366F1');
                root.style.setProperty('--cosmos-blue', theme.secondary || '#3B82F6');
                // Derive a darker navy from primary for hover states
                root.style.setProperty('--cosmos-navy', theme.primary || '#4338CA');
                root.style.setProperty('--cosmos-bg-accent', theme.bg || '#eef2ff');
                root.style.setProperty('--cosmos-primary-glow', `${theme.primary || '#6366F1'}20`);
            }
        } catch (e) {
            console.error('Theme injection failed:', e);
        }
    }, [selectedInstituteId, institutes]);

    return (
        <GlobalContext.Provider value={{ 
            selectedInstituteId, 
            setSelectedInstituteId, 
            role, 
            institutes, 
            currentInstitute,
            loading,
            refreshInstitutes
        }}>
            {children}
        </GlobalContext.Provider>
    )
}

export function useGlobalContext() {
    const context = useContext(GlobalContext)
    if (context === undefined) {
        throw new Error('useGlobalContext must be used within a GlobalProvider')
    }
    return context
}
