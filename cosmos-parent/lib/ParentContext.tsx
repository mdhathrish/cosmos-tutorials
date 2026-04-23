import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface Institute {
  id: string
  name: string
  logo_url: string | null
  theme_id: string | null
  tagline: string | null
}

interface ParentContextType {
  parentUser: { id: string; full_name: string } | null
  students: any[]
  selectedStudent: any | null
  setSelectedStudentId: (id: string) => void
  institute: Institute | null
  loading: boolean
  refreshData: () => Promise<void>
}

const ParentContext = createContext<ParentContextType | undefined>(undefined)

export function ParentProvider({ children }: { children: React.ReactNode }) {
  const [parentUser, setParentUser] = useState<{ id: string; full_name: string } | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, _setSelectedStudentId] = useState<string | null>(null)
  const [institute, setInstitute] = useState<Institute | null>(null)
  const [loading, setLoading] = useState(true)

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0] || null

  const setSelectedStudentId = (id: string) => {
    _setSelectedStudentId(id)
    AsyncStorage.setItem('selected_student_id', id)
  }

  async function loadData() {
    setLoading(true)
    try {
      // Restore cached student selection
      const cachedStudentId = await AsyncStorage.getItem('selected_student_id')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setParentUser(null)
        setStudents([])
        setInstitute(null)
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('auth_id', user.id)
        .single()

      if (!userData) { setLoading(false); return }
      setParentUser(userData)
      AsyncStorage.setItem('user_name', userData.full_name)

      const { data: studentData } = await supabase
        .from('students')
        .select('*, batches(batch_name, subject, timing_start, timing_end)')
        .eq('parent_id', userData.id)
        .eq('is_active', true)

      if (studentData && studentData.length > 0) {
        setStudents(studentData)
        // Restore or pick first student
        const restoredId = cachedStudentId && studentData.find(s => s.id === cachedStudentId)
          ? cachedStudentId : studentData[0].id
        _setSelectedStudentId(restoredId)
        AsyncStorage.setItem('student_profile', JSON.stringify(studentData[0]))

        // Fetch institute branding
        const instId = studentData[0].institute_id
        if (instId) {
          const { data: instData } = await supabase
            .from('institutes')
            .select('id, name, logo_url, theme_id, tagline, is_active')
            .eq('id', instId)
            .single()
          if (instData) {
            if (instData.is_active === false) {
              await supabase.auth.signOut()
              return
            }
            setInstitute(instData)
          }
        }
      }
    } catch (e) {
      console.error('[ParentContext] Init error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setParentUser(null)
        setStudents([])
        _setSelectedStudentId(null)
        setInstitute(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN') {
        loadData()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ParentContext.Provider value={{
      parentUser, students, selectedStudent,
      setSelectedStudentId, institute, loading, refreshData: loadData,
    }}>
      {children}
    </ParentContext.Provider>
  )
}

export function useParentContext() {
  const context = useContext(ParentContext)
  if (!context) throw new Error('useParentContext must be used within ParentProvider')
  return context
}
