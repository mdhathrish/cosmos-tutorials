'use client'
import { AlertTriangle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import Sidebar from './Sidebar'

interface ModuleErrorProps {
    module: string
    error: Error & { digest?: string }
    reset: () => void
}

export default function ModuleError({ module, error, reset }: ModuleErrorProps) {
    const [showStack, setShowStack] = useState(false)
    const timestamp = new Date().toLocaleString('en-IN', { 
        dateStyle: 'medium', timeStyle: 'medium' 
    })

    const copyErrorReport = () => {
        const report = [
            `Module: ${module}`,
            `Time: ${timestamp}`,
            `Error: ${error.message}`,
            error.digest ? `Digest: ${error.digest}` : '',
            `Stack:\n${error.stack || 'N/A'}`
        ].filter(Boolean).join('\n')
        navigator.clipboard.writeText(report)
    }

    return (
        <div className="flex min-h-screen bg-cosmos-bg star-bg">
            <Sidebar />
            <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
                <div className="max-w-xl mx-auto mt-12">
                    <div className="cosmos-card" style={{ borderLeft: '4px solid var(--cosmos-red)' }}>
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                                 style={{ background: 'color-mix(in srgb, var(--cosmos-red) 10%, transparent)' }}>
                                <AlertTriangle size={24} style={{ color: 'var(--cosmos-red)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="font-display font-bold text-lg text-cosmos-text mb-1">
                                    {module} — Error
                                </h2>
                                <p className="text-xs text-cosmos-muted leading-relaxed">
                                    This module crashed but the rest of the app is unaffected.
                                    You can retry or navigate to another page.
                                </p>
                            </div>
                        </div>

                        {/* Error Details */}
                        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--cosmos-surface)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-cosmos-muted">Error Message</span>
                            </div>
                            <p className="text-sm font-mono font-medium break-words" style={{ color: 'var(--cosmos-red)' }}>
                                {error.message || 'An unexpected error occurred'}
                            </p>
                        </div>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="rounded-lg p-3" style={{ background: 'var(--cosmos-surface)' }}>
                                <div className="text-[10px] font-black uppercase tracking-widest text-cosmos-muted mb-0.5">Module</div>
                                <div className="text-sm font-bold text-cosmos-text">{module}</div>
                            </div>
                            <div className="rounded-lg p-3" style={{ background: 'var(--cosmos-surface)' }}>
                                <div className="text-[10px] font-black uppercase tracking-widest text-cosmos-muted mb-0.5">Time</div>
                                <div className="text-sm font-bold text-cosmos-text">{timestamp}</div>
                            </div>
                        </div>

                        {/* Stack Trace (collapsible) */}
                        {error.stack && (
                            <div className="mb-4">
                                <button 
                                    onClick={() => setShowStack(!showStack)}
                                    className="flex items-center gap-2 text-xs font-bold text-cosmos-muted hover:text-cosmos-text transition-colors w-full"
                                >
                                    {showStack ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    <span className="uppercase tracking-wider">Stack Trace</span>
                                </button>
                                {showStack && (
                                    <pre className="mt-2 text-[11px] font-mono p-3 rounded-lg overflow-auto max-h-48 leading-relaxed text-cosmos-muted"
                                         style={{ background: 'var(--cosmos-surface)' }}>
                                        {error.stack}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--cosmos-border)' }}>
                            <button 
                                onClick={reset}
                                className="btn-primary text-xs flex items-center gap-2 px-5 py-2.5"
                            >
                                <RefreshCw size={13} />
                                Retry Module
                            </button>
                            <button 
                                onClick={copyErrorReport}
                                className="btn-secondary text-xs flex items-center gap-2 px-4 py-2.5"
                            >
                                <Copy size={13} />
                                Copy Report
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
