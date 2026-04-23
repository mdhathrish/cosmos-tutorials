'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient, type Batch } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGlobalContext } from '@/lib/GlobalContext'
import * as XLSX from 'xlsx'
import Link from 'next/link'

interface ParsedRow {
  full_name: string
  grade: number | string
  parent_name: string
  parent_phone: string
  parent_email: string
  monthly_fee: string
  school_name: string
  student_code: string
  batch_id: string
}

const EMPTY_ROW: ParsedRow = {
  full_name: '', grade: '', parent_name: '', parent_phone: '',
  parent_email: '', monthly_fee: '', school_name: '', student_code: '', batch_id: ''
}

export default function ImportPage() {
  const supabase = createClient()
  const { selectedInstituteId, role } = useGlobalContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload')
  const [rawData, setRawData] = useState<any[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [results, setResults] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  // Manual mode
  const [isManual, setIsManual] = useState(false)
  const [manualRows, setManualRows] = useState<ParsedRow[]>(Array(5).fill(null).map(() => ({ ...EMPTY_ROW })))
  const [sheetsUrl, setSheetsUrl] = useState('')
  const [sheetsLoading, setSheetsLoading] = useState(false)

  // Column mapping
  const [columnMap, setColumnMap] = useState<{ [key: string]: string }>({})
  const FIELDS = [
    { key: 'full_name', label: 'Student Name', required: true },
    { key: 'grade', label: 'Grade' },
    { key: 'parent_name', label: 'Parent Name' },
    { key: 'parent_phone', label: 'Parent Phone', required: true },
    { key: 'parent_email', label: 'Parent Email' },
    { key: 'monthly_fee', label: 'Monthly Fee' },
    { key: 'school_name', label: 'School Name' },
    { key: 'student_code', label: 'Student/Roll Code' },
  ]

  useEffect(() => {
    let batchQuery = supabase.from('batches').select('*').eq('is_active', true)
    if (selectedInstituteId !== 'all') {
      batchQuery = batchQuery.eq('institute_id', selectedInstituteId)
    }
    batchQuery.then(({ data }) => setBatches(data || []))
  }, [selectedInstituteId])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        processSpreadsheetData(json)
      } catch (err) {
        toast.error('Failed to parse file. Make sure it is a valid .xlsx or .csv')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Process parsed spreadsheet data (shared between file upload and Google Sheets)
  const processSpreadsheetData = (json: any[][]) => {
    if (json.length < 2) {
      toast.error('Data must have at least a header row and one data row')
      return
    }

    const hdrs = (json[0] as string[]).map(h => String(h).trim())
    setHeaders(hdrs)
    setRawData(json.slice(1).filter(row => row.some(cell => cell)))

    const autoMap: { [key: string]: string } = {}
    FIELDS.forEach(f => {
      const match = hdrs.find(h => {
        const lower = h.toLowerCase()
        if (f.key === 'full_name') return lower.includes('name') && !lower.includes('parent') && !lower.includes('school')
        if (f.key === 'grade') return lower.includes('grade') || lower.includes('class')
        if (f.key === 'parent_name') return lower.includes('parent') && lower.includes('name')
        if (f.key === 'parent_phone') return lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')
        if (f.key === 'parent_email') return lower.includes('email')
        if (f.key === 'monthly_fee') return lower.includes('fee')
        if (f.key === 'school_name') return lower.includes('school')
        if (f.key === 'student_code') return lower.includes('code') || lower.includes('roll') || lower.includes('enrollment')
        return false
      })
      if (match) autoMap[f.key] = match
    })
    setColumnMap(autoMap)
    setStep('map')
    toast.success(`Found ${json.length - 1} rows`)
  }

  const handleGoogleSheetsImport = async () => {
    if (!sheetsUrl.trim()) { toast.error('Paste a Google Sheets URL'); return }
    setSheetsLoading(true)

    try {
      // Convert Google Sheets URL to CSV export URL
      // Supports: https://docs.google.com/spreadsheets/d/SHEET_ID/edit...
      const match = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
      if (!match) {
        toast.error('Invalid Google Sheets URL. Make sure the sheet is publicly shared.')
        setSheetsLoading(false)
        return
      }

      const sheetId = match[1]
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

      const res = await fetch(csvUrl)
      if (!res.ok) {
        toast.error('Could not fetch sheet. Make sure it is shared publicly (Anyone with link → Viewer).')
        setSheetsLoading(false)
        return
      }

      const csvText = await res.text()
      const workbook = XLSX.read(csvText, { type: 'string' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      processSpreadsheetData(json)
    } catch (err) {
      toast.error('Failed to import from Google Sheets')
    } finally {
      setSheetsLoading(false)
    }
  }

  const handleMapConfirm = () => {
    if (!columnMap.full_name || !columnMap.parent_phone) {
      toast.error('Student Name and Parent Phone columns are required')
      return
    }

    const mapped: ParsedRow[] = rawData.map(row => {
      const getVal = (field: string) => {
        const colName = columnMap[field]
        if (!colName) return ''
        const idx = headers.indexOf(colName)
        return idx >= 0 ? String(row[idx] || '').trim() : ''
      }
      return {
        full_name: getVal('full_name'),
        grade: getVal('grade'),
        parent_name: getVal('parent_name'),
        parent_phone: getVal('parent_phone'),
        parent_email: getVal('parent_email'),
        monthly_fee: getVal('monthly_fee'),
        school_name: getVal('school_name'),
        student_code: getVal('student_code'),
        batch_id: batches[0]?.id || ''
      }
    }).filter(r => r.full_name && r.parent_phone)

    setRows(mapped)
    setStep('preview')
  }

  const handleImport = async (dataRows: ParsedRow[]) => {
    if (selectedInstituteId === 'all') {
      toast.error('Select a specific institute first')
      return
    }

    const validRows = dataRows.filter(r => r.full_name.trim() && r.parent_phone.trim() && r.batch_id)
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setStep('importing')

    const res = await fetch('/api/import-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: validRows.map(r => ({
          full_name: r.full_name,
          grade: parseInt(String(r.grade)) || 8,
          batch_id: r.batch_id,
          parent_name: r.parent_name || undefined,
          parent_phone: r.parent_phone,
          parent_email: r.parent_email || undefined,
          monthly_fee: r.monthly_fee ? parseFloat(r.monthly_fee) : undefined,
          school_name: r.school_name || undefined,
          student_code: r.student_code || undefined,
        })),
        institute_id: selectedInstituteId
      })
    })

    const data = await res.json()
    setResults(data)
    setStep('done')
    if (data.imported > 0) toast.success(`Imported ${data.imported} students!`)
    if (data.errors?.length > 0) toast.error(`${data.errors.length} errors occurred`)
  }

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-cosmos-text tracking-tight">Import Students</h1>
          <p className="text-cosmos-muted text-sm mt-1">Upload Excel (.xlsx), CSV, Google Sheets, or enter data manually</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['Upload', 'Map Columns', 'Preview', 'Import'].map((s, i) => {
            const stepOrder = ['upload', 'map', 'preview', 'importing']
            const active = stepOrder.indexOf(step === 'done' ? 'importing' : step) >= i
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-cosmos-primary text-white' : 'bg-cosmos-surface text-cosmos-muted border border-cosmos-border'}`}>
                  {step === 'done' && i === 3 ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-bold ${active ? 'text-cosmos-primary' : 'text-cosmos-muted'} hidden sm:block`}>{s}</span>
                {i < 3 && <ArrowRight size={14} className="text-cosmos-border" />}
              </div>
            )
          })}
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cosmos-card border-2 border-dashed border-cosmos-primary/30 bg-cosmos-primary/5 hover:bg-cosmos-primary/10 transition-colors cursor-pointer text-center py-16 rounded-2xl"
            >
              <FileSpreadsheet size={48} className="text-cosmos-primary mx-auto mb-4 opacity-60" />
              <h3 className="font-display font-bold text-lg text-cosmos-text">Upload Excel / CSV File</h3>
              <p className="text-cosmos-muted text-sm mt-2">Drag & drop or click to browse (.xlsx, .csv)</p>
              <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            </div>

            <div className="text-center text-cosmos-muted text-sm">— or —</div>

            <button onClick={() => setIsManual(true)} className="w-full cosmos-card text-center py-8 hover:bg-cosmos-surface/80 transition-colors cursor-pointer">
              <Plus size={32} className="text-cosmos-blue mx-auto mb-3 opacity-60" />
              <h3 className="font-display font-bold text-lg text-cosmos-text">Enter Manually</h3>
              <p className="text-cosmos-muted text-sm mt-1">Type in student data row by row</p>
            </button>

            <div className="text-center text-cosmos-muted text-sm">— or —</div>

            {/* Google Sheets Import */}
            <div className="cosmos-card">
              <h3 className="font-display font-bold text-cosmos-text mb-2 flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#0F9D58"><path d="M19 11V9h-6V3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V17h-4v2H7.5a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H11v5h4v1h4zm-4 2v2h4v-2h-4zm0 4v2h4v-2h-4z"/></svg>
                Import from Google Sheets
              </h3>
              <p className="text-xs text-cosmos-muted mb-3">Share your sheet publicly (Anyone with link → Viewer), then paste the URL below</p>
              <div className="flex gap-2">
                <input
                  className="cosmos-input flex-1 text-sm"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetsUrl}
                  onChange={e => setSheetsUrl(e.target.value)}
                />
                <button onClick={handleGoogleSheetsImport} disabled={sheetsLoading} className="btn-primary text-sm whitespace-nowrap flex items-center gap-1">
                  {sheetsLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  Import
                </button>
              </div>
            </div>

            {/* Manual Entry */}
            {isManual && (
              <div className="cosmos-card p-0 overflow-x-auto">
                <table className="cosmos-table text-sm min-w-[900px]">
                  <thead>
                    <tr>
                      <th className="w-8">#</th>
                      <th>Student Name *</th>
                      <th>Grade</th>
                      <th>Parent Phone *</th>
                      <th>Parent Name</th>
                      <th>Batch</th>
                      <th>Fee</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualRows.map((row, i) => (
                      <tr key={i}>
                        <td className="text-cosmos-muted text-xs">{i + 1}</td>
                        <td><input className="cosmos-input text-xs py-1.5" placeholder="Name" value={row.full_name} onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], full_name: e.target.value }; setManualRows(r) }} /></td>
                        <td><input className="cosmos-input text-xs py-1.5 w-16" placeholder="8" value={row.grade} onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], grade: e.target.value }; setManualRows(r) }} /></td>
                        <td><input className="cosmos-input text-xs py-1.5" placeholder="9876543210" value={row.parent_phone} onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], parent_phone: e.target.value }; setManualRows(r) }} /></td>
                        <td><input className="cosmos-input text-xs py-1.5" placeholder="Parent Name" value={row.parent_name} onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], parent_name: e.target.value }; setManualRows(r) }} /></td>
                        <td>
                          <select className="cosmos-input text-xs py-1.5" value={row.batch_id} onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], batch_id: e.target.value }; setManualRows(r) }}>
                            <option value="">Select…</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                          </select>
                        </td>
                        <td><input className="cosmos-input text-xs py-1.5 w-20" placeholder="₹" value={row.monthly_fee} onChange={e => { const r = [...manualRows]; r[i] = { ...r[i], monthly_fee: e.target.value }; setManualRows(r) }} /></td>
                        <td>
                          <button onClick={() => setManualRows(prev => prev.filter((_, idx) => idx !== i))} className="text-cosmos-red hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 flex items-center justify-between border-t border-cosmos-border">
                  <button onClick={() => setManualRows(prev => [...prev, ...Array(5).fill(null).map(() => ({ ...EMPTY_ROW }))])} className="btn-secondary text-xs">
                    <Plus size={12} className="inline mr-1" /> Add 5 Rows
                  </button>
                  <button onClick={() => handleImport(manualRows)} className="btn-primary text-sm flex items-center gap-2">
                    <Upload size={14} /> Import {manualRows.filter(r => r.full_name && r.parent_phone && r.batch_id).length} Students
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map Columns Step */}
        {step === 'map' && (
          <div className="max-w-2xl mx-auto">
            <div className="cosmos-card space-y-4">
              <h3 className="font-display font-bold text-cosmos-text">Map Your Columns</h3>
              <p className="text-xs text-cosmos-muted">We detected {headers.length} columns. Match them to the correct fields.</p>
              {FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-4">
                  <label className="w-36 text-sm font-bold text-cosmos-text">
                    {f.label} {f.required && <span className="text-cosmos-red">*</span>}
                  </label>
                  <select
                    className="cosmos-input flex-1"
                    value={columnMap[f.key] || ''}
                    onChange={e => setColumnMap(prev => ({ ...prev, [f.key]: e.target.value }))}
                  >
                    <option value="">— Skip —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="w-36 text-sm font-bold text-cosmos-text">Default Batch</label>
                <select className="cosmos-input mt-1" onChange={() => {}}>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name} — Grade {b.grade}</option>)}
                </select>
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep('upload')} className="btn-secondary text-sm"><ArrowLeft size={14} className="inline mr-1" /> Back</button>
                <button onClick={handleMapConfirm} className="btn-primary text-sm"><ArrowRight size={14} className="inline mr-1" /> Preview Data</button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div className="max-w-4xl mx-auto">
            <div className="cosmos-card p-0 overflow-x-auto">
              <div className="p-4 border-b border-cosmos-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-cosmos-text">{rows.length} students ready to import</h3>
                  <p className="text-xs text-cosmos-muted mt-0.5">Review the data below, then click Import</p>
                </div>
                <div className="flex gap-2">
                  <select className="cosmos-input text-xs" onChange={e => {
                    if (e.target.value) setRows(prev => prev.map(r => ({ ...r, batch_id: e.target.value })))
                  }}>
                    <option value="">Assign Batch…</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                  </select>
                </div>
              </div>
              <table className="cosmos-table text-sm min-w-[800px]">
                <thead><tr><th>#</th><th>Student Name</th><th>Grade</th><th>Parent Phone</th><th>Parent Name</th><th>Batch</th></tr></thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i}>
                      <td className="text-cosmos-muted text-xs">{i + 1}</td>
                      <td className="font-medium">{r.full_name}</td>
                      <td>{r.grade || '—'}</td>
                      <td className="font-mono text-sm">{r.parent_phone}</td>
                      <td>{r.parent_name || '—'}</td>
                      <td>
                        <select className="cosmos-input text-xs py-1" value={r.batch_id} onChange={e => {
                          const updated = [...rows]; updated[i] = { ...updated[i], batch_id: e.target.value }; setRows(updated)
                        }}>
                          <option value="">Select…</option>
                          {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {rows.length > 20 && (
                    <tr><td colSpan={6} className="text-center text-cosmos-muted text-xs py-4">…and {rows.length - 20} more rows</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep('map')} className="btn-secondary text-sm"><ArrowLeft size={14} className="inline mr-1" /> Back</button>
              <button onClick={() => handleImport(rows)} className="btn-primary text-sm flex items-center gap-2">
                <Upload size={14} /> Import {rows.length} Students
              </button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="max-w-md mx-auto cosmos-card text-center py-16">
            <Loader2 size={40} className="animate-spin text-cosmos-primary mx-auto mb-4" />
            <h3 className="font-display font-bold text-lg text-cosmos-text">Importing Students…</h3>
            <p className="text-cosmos-muted text-sm mt-2">Creating parent accounts and enrolling students. This may take a minute.</p>
          </div>
        )}

        {/* Done Step */}
        {step === 'done' && results && (
          <div className="max-w-lg mx-auto cosmos-card text-center py-12">
            <CheckCircle size={48} className="text-cosmos-green mx-auto mb-4" />
            <h3 className="font-display font-bold text-2xl text-cosmos-text">Import Complete</h3>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="cosmos-card bg-cosmos-green/5 border-cosmos-green/20">
                <div className="text-2xl font-black text-cosmos-green">{results.imported}</div>
                <div className="text-xs text-cosmos-muted">Imported</div>
              </div>
              <div className="cosmos-card bg-cosmos-red/5 border-cosmos-red/20">
                <div className="text-2xl font-black text-cosmos-red">{results.skipped}</div>
                <div className="text-xs text-cosmos-muted">Skipped</div>
              </div>
            </div>
            {results.errors.length > 0 && (
              <div className="mt-6 text-left">
                <h4 className="text-sm font-bold text-cosmos-red mb-2 flex items-center gap-1"><AlertCircle size={14} /> Errors</h4>
                <div className="bg-cosmos-red/5 rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-cosmos-red space-y-1">
                  {results.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </div>
            )}
            <div className="mt-8 flex justify-center gap-3">
              <button onClick={() => { setStep('upload'); setIsManual(false); setRawData([]); setRows([]); setResults(null) }} className="btn-secondary text-sm">Import More</button>
              <Link href="/students" className="btn-primary text-sm">View Students</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
