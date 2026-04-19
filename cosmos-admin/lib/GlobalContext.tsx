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
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined)

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    const [selectedInstituteId, setSelectedInstituteId] = useState('all')
    const [role, setRole] = useState('')
    const [institutes, setInstitutes] = useState<any[]>([])
    const [currentInstitute, setCurrentInstitute] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
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
                    if (inst) setInstitutes([inst])
                }
            }
            setLoading(false)
        }
        init()
    }, [])

    // Apply Theme Dynamically
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const activeInst = selectedInstituteId === 'all' 
            ? null 
            : institutes.find(i => i.id === selectedInstituteId);
        
        setCurrentInstitute(activeInst);

        const theme = getThemeById(activeInst?.theme_id || 'cosmos-indigo');
        
        // Inject CSS variables safely
        try {
            const root = document.documentElement;
            if (root) {
                root.style.setProperty('--cosmos-primary', theme.primary || '#4f46e5');
                root.style.setProperty('--cosmos-blue', theme.secondary || '#6366f1');
                root.style.setProperty('--cosmos-bg-accent', theme.bg || '#eef2ff');
                root.style.setProperty('--cosmos-primary-glow', `${theme.primary || '#4f46e5'}20`);
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
            loading 
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
