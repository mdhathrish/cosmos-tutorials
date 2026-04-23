'use client'
import { useEffect, useState } from 'react'
import { createClient, type Batch } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Clock, Loader2 } from 'lucide-react'
import { useGlobalContext } from '@/lib/GlobalContext'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6am to 9pm

const subjectColors: { [s: string]: { bg: string; border: string; text: string } } = {
  Mathematics: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  Physics:     { bg: 'bg-cyan-100',   border: 'border-cyan-300',   text: 'text-cyan-800' },
  Chemistry:   { bg: 'bg-amber-100',  border: 'border-amber-300',  text: 'text-amber-800' },
  Biology:     { bg: 'bg-green-100',   border: 'border-green-300',  text: 'text-green-800' },
}

const defaultColor = { bg: 'bg-cosmos-primary/10', border: 'border-cosmos-primary/30', text: 'text-cosmos-primary' }

interface TimetableSlot {
  batch: Batch & { institutes?: { name: string } }
  day: string
  startHour: number
  startMin: number
  endHour: number
  endMin: number
}

export default function TimetablePage() {
  const supabase = createClient()
  const { selectedInstituteId } = useGlobalContext()
  const [batches, setBatches] = useState<(Batch & { institutes?: { name: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<TimetableSlot[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase.from('batches').select('*, institutes(name)').eq('is_active', true)
      if (selectedInstituteId !== 'all') {
        query = query.eq('institute_id', selectedInstituteId)
      }
      const { data } = await query.order('timing_start')
      if (data) {
        setBatches(data)
        // Convert batch timings to timetable slots
        const allSlots: TimetableSlot[] = []
        data.forEach(batch => {
          const startParts = batch.timing_start?.split(':').map(Number) || [0, 0]
          const endParts = batch.timing_end?.split(':').map(Number) || [0, 0]
          const days = batch.days_of_week || []
          days.forEach((day: string) => {
            allSlots.push({
              batch,
              day,
              startHour: startParts[0],
              startMin: startParts[1],
              endHour: endParts[0],
              endMin: endParts[1]
            })
          })
        })
        setSlots(allSlots)
      }
      setLoading(false)
    }
    load()
  }, [selectedInstituteId])

  const getSlotStyle = (slot: TimetableSlot) => {
    const topOffset = (slot.startHour - 6) * 60 + slot.startMin
    const duration = (slot.endHour - slot.startHour) * 60 + (slot.endMin - slot.startMin)
    return {
      top: `${topOffset}px`,
      height: `${Math.max(duration, 30)}px`,
    }
  }

  return (
    <div className="flex min-h-screen bg-cosmos-bg star-bg">
      <Sidebar />
      <main className="md:ml-64 flex-1 p-4 md:p-8 w-full max-w-[100vw] pt-24 md:pt-12">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-cosmos-text flex items-center gap-2">
            <Clock size={24} className="text-cosmos-primary" /> Weekly Timetable
          </h1>
          <p className="text-cosmos-muted text-sm mt-0.5">{batches.length} active batches scheduled</p>
        </div>

        {loading ? (
          <div className="cosmos-card flex items-center justify-center py-16">
            <Loader2 size={28} className="text-cosmos-primary animate-spin" />
          </div>
        ) : (
          <div className="cosmos-card p-0 overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Day Headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-cosmos-border sticky top-0 bg-cosmos-card z-10">
                <div className="p-3 text-xs font-bold text-cosmos-muted border-r border-cosmos-border">Time</div>
                {DAYS.map(day => (
                  <div key={day} className="p-3 text-center">
                    <span className="text-sm font-bold text-cosmos-text">{day}</span>
                    <div className="text-[10px] text-cosmos-muted">{slots.filter(s => s.day === day).length} classes</div>
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ height: `${16 * 60}px` }}>
                {/* Hour labels */}
                <div className="border-r border-cosmos-border relative">
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="absolute w-full text-right pr-2 text-[10px] text-cosmos-muted font-mono"
                      style={{ top: `${(h - 6) * 60}px` }}
                    >
                      {h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {DAYS.map(day => (
                  <div key={day} className="border-r border-cosmos-border/30 relative">
                    {/* Hour grid lines */}
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="absolute w-full border-t border-cosmos-border/20"
                        style={{ top: `${(h - 6) * 60}px` }}
                      />
                    ))}

                    {/* Slots */}
                    {slots.filter(s => s.day === day).map((slot, i) => {
                      const color = subjectColors[slot.batch.subject] || defaultColor
                      return (
                        <div
                          key={`${slot.batch.id}-${i}`}
                          className={`absolute left-1 right-1 rounded-lg ${color.bg} ${color.border} border px-2 py-1 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group`}
                          style={getSlotStyle(slot)}
                        >
                          <div className={`text-[10px] font-black ${color.text} truncate`}>{slot.batch.batch_name}</div>
                          <div className="text-[9px] text-gray-500 truncate">
                            {slot.batch.timing_start?.slice(0, 5)} – {slot.batch.timing_end?.slice(0, 5)}
                          </div>
                          <div className="text-[9px] text-gray-400 truncate">Gr {slot.batch.grade} · {slot.batch.subject}</div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Batch Legend */}
        {!loading && batches.length > 0 && (
          <div className="mt-6 cosmos-card">
            <h3 className="text-sm font-bold text-cosmos-text mb-3">Legend</h3>
            <div className="flex flex-wrap gap-3">
              {batches.map(b => {
                const color = subjectColors[b.subject] || defaultColor
                return (
                  <div key={b.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color.border} ${color.bg}`}>
                    <div className={`w-2 h-2 rounded-full ${color.text.replace('text-', 'bg-')}`} />
                    <span className={`text-xs font-bold ${color.text}`}>{b.batch_name}</span>
                    <span className="text-[10px] text-gray-500">{b.days_of_week?.join(', ')}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
