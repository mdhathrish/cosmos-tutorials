'use client'
import ModuleError from '@/components/ModuleError'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return <ModuleError module="Calendar" error={error} reset={reset} />
}
