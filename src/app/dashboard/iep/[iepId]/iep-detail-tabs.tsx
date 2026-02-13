'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ClaudeBadge } from '@/components/ui/claude-badge'

interface Accommodation {
  type: string
  description: string
}

interface Modification {
  type: string
  description: string
}

interface RelatedService {
  service: string
  frequency: string
  location: string
  provider: string
}

interface GoalData {
  id: string
  iepId: string
  area: string
  goalText: string
  baseline: string | null
  target: string | null
  measureMethod: string | null
  frequency: string | null
  timeline: string | null
  status: string
  similarityScore: number | null
  aiGenerated: boolean
  createdAt: string
  dataPoints: {
    id: string
    goalId: string
    studentId: string
    value: number
    unit: string
    date: string
    notes: string | null
    recordedBy: string | null
  }[]
  latestDataPoint: {
    value: number
    unit: string
    date: string
  } | null
  dataPointCount: number
  trend: 'up' | 'down' | 'flat' | null
}

interface DeadlineData {
  id: string
  type: string
  studentId: string
  dueDate: string
  status: string
  completedAt: string | null
  notes: string | null
}

interface IepDetailTabsProps {
  iep: {
    id: string
    presentLevels: string | null
    status: string
    studentId: string
  }
  goals: GoalData[]
  accommodations: Accommodation[]
  modifications: Modification[]
  relatedServices: RelatedService[]
  deadlines: DeadlineData[]
  studentName: string
}

export function IepDetailTabs({
  iep,
  goals,
  accommodations,
  modifications,
  relatedServices,
  deadlines,
}: IepDetailTabsProps) {
  return (
    <div className="space-y-6">
      {/* Present Levels */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          Present Levels
        </h2>
        {iep.presentLevels ? (
          <div className="text-sm text-stone-600 prose prose-stone prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children, ...props }) => <table className="w-full border-collapse my-4 text-sm" {...props}>{children}</table>,
                th: ({ children, ...props }) => <th className="border border-stone-300 bg-stone-50 px-3 py-2 text-left font-medium" {...props}>{children}</th>,
                td: ({ children, ...props }) => <td className="border border-stone-300 px-3 py-2" {...props}>{children}</td>,
              }}
            >{iep.presentLevels}</ReactMarkdown>
            <ClaudeBadge className="mt-3 justify-end" />
          </div>
        ) : (
          <p className="text-sm text-stone-400 italic">
            No present levels documented yet.
          </p>
        )}
      </section>

      {/* Goals */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          Goals ({goals.length})
        </h2>
        {goals.length === 0 ? (
          <p className="text-sm text-stone-400 italic">No goals added yet.</p>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-md border border-stone-100 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                      {goal.area}
                    </span>
                    <p className="text-sm text-stone-700 mt-1">
                      {goal.goalText}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      goal.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : goal.status === 'met'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {goal.status}
                  </span>
                </div>
                {goal.baseline && (
                  <p className="text-xs text-stone-500">
                    Baseline: {goal.baseline}
                    {goal.target ? ` | Target: ${goal.target}` : ''}
                  </p>
                )}
                <p className="text-xs text-stone-400">
                  {goal.dataPointCount} data point
                  {goal.dataPointCount !== 1 ? 's' : ''}
                  {goal.latestDataPoint &&
                    ` | Latest: ${goal.latestDataPoint.value} ${goal.latestDataPoint.unit}`}
                  {goal.trend && ` | Trend: ${goal.trend}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Accommodations */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          Accommodations & Modifications
        </h2>
        {accommodations.length === 0 && modifications.length === 0 ? (
          <p className="text-sm text-stone-400 italic">
            No accommodations or modifications documented yet.
          </p>
        ) : (
          <div className="space-y-3">
            {accommodations.map((a, i) => (
              <div key={`acc-${i}`} className="text-sm text-stone-600">
                <span className="font-medium">{a.type.charAt(0).toUpperCase() + a.type.slice(1)}:</span> {a.description}
              </div>
            ))}
            {modifications.map((m, i) => (
              <div key={`mod-${i}`} className="text-sm text-stone-600">
                <span className="font-medium">{m.type.charAt(0).toUpperCase() + m.type.slice(1)} (modification):</span>{' '}
                {m.description}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Related Services */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          Related Services
        </h2>
        {relatedServices.length === 0 ? (
          <p className="text-sm text-stone-400 italic">
            No related services documented yet.
          </p>
        ) : (
          <div className="space-y-2">
            {relatedServices.map((s, i) => (
              <div key={i} className="text-sm text-stone-600">
                <span className="font-medium">{s.service}:</span>{' '}
                {s.frequency}, {s.location}
                {s.provider && ` (${s.provider})`}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Compliance Deadlines */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="font-serif text-lg font-semibold text-stone-900 mb-3">
          Compliance Deadlines
        </h2>
        {deadlines.length === 0 ? (
          <p className="text-sm text-stone-400 italic">
            No compliance deadlines tracked yet.
          </p>
        ) : (
          <div className="space-y-2">
            {deadlines.map((d) => {
              const dueDate = new Date(d.dueDate)
              const now = new Date()
              const daysLeft = Math.ceil(
                (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              )
              const isOverdue = daysLeft < 0
              const isUrgent = daysLeft >= 0 && daysLeft < 15

              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="text-stone-700 font-medium">
                      {d.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                    <span className="text-stone-400 ml-2">
                      {dueDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      d.status === 'completed'
                        ? 'bg-blue-50 text-blue-700'
                        : isOverdue
                          ? 'bg-red-100 text-red-700'
                          : isUrgent
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {d.status === 'completed'
                      ? 'Completed'
                      : isOverdue
                        ? `${Math.abs(daysLeft)}d overdue`
                        : `${daysLeft}d remaining`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
