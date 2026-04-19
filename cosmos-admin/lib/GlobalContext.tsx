'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface GlobalContextType {
    selectedInstituteId: string // 'all' or UUID
    setSelectedInstituteId: (id: string) => void
    role: string
    institutes: any[]
    loading: boolean
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined)

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    const [selectedInstituteId, setSelectedInstituteId] = useState('all')
    const [role, setRole] = useState('')
    const [institutes, setInstitutes] = useState<any[]>([])
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
                        .select('id, name')
                        .eq('is_deleted', false)
                        .order('name')
                    setInstitutes(insts || [])
                } else {
                    // If regular admin, they are locked to their institute
                    setSelectedInstituteId(userData.institute_id)
                }
            }
            setLoading(false)
        }
        init()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <GlobalContext.Provider value={{ 
            selectedInstituteId, 
            setSelectedInstituteId, 
            role, 
            institutes, 
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
