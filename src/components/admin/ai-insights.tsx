'use client'

import { useState } from 'react'
import { Sparkles, AlertTriangle, CheckCircle2, Lightbulb, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface InsightsData {
  executiveSummary: string
  keyFindings: string[]
  concerns: string[]
  recommendations: string[]
}

export function AIInsights() {
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateInsights() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/insights', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate insights')
      }

      const data = await res.json()
      setInsights(data.insights)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-stone-900">
            AI District Insights
          </h3>
          <p className="text-sm text-stone-500">
            Generate an AI-powered analysis of district-wide performance and trends.
          </p>
        </div>
        <Button
          onClick={generateInsights}
          disabled={loading}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2" />
              Generate AI District Insights
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {insights && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="size-5" />
              <span className="font-semibold">AI-Generated District Analysis</span>
            </div>
          </div>

          <CardContent className="space-y-6 pt-6">
            {/* Executive Summary */}
            <div>
              <h4 className="text-sm font-semibold text-stone-700 mb-2">
                Executive Summary
              </h4>
              <p className="text-sm text-stone-600 leading-relaxed">
                {insights.executiveSummary}
              </p>
            </div>

            {/* Key Findings */}
            {insights.keyFindings.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Key Findings
                </h4>
                <ul className="space-y-1.5">
                  {insights.keyFindings.map((finding, i) => (
                    <li
                      key={i}
                      className="text-sm text-stone-600 flex items-start gap-2"
                    >
                      <span className="text-emerald-500 mt-1 shrink-0">&#x2022;</span>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {insights.concerns.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="size-4" />
                  Areas of Concern
                </h4>
                <ul className="space-y-1.5">
                  {insights.concerns.map((concern, i) => (
                    <li
                      key={i}
                      className="text-sm text-amber-800 flex items-start gap-2"
                    >
                      <span className="text-amber-500 mt-1 shrink-0">&#x2022;</span>
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-1.5">
                  <Lightbulb className="size-4 text-amber-600" />
                  Recommendations
                </h4>
                <ol className="space-y-2">
                  {insights.recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="text-sm text-stone-600 flex items-start gap-3"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
