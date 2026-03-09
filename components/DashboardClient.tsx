"use client"

import { useState } from "react"
import ArticleModal from "./ArticleModal"

type Article = {
  id: string
  title: string
  url: string
  published_at: string
  rss_source: string
  score: number
  dominant_domain: string
  summary: string
  why_it_matters?: string
}

const domainColors: Record<string, string> = {
  "Bill Execution": "bg-blue-100 text-blue-700",
  "Family Coordination": "bg-purple-100 text-purple-700",
  "Fraud": "bg-red-100 text-red-700",
  "Cognitive Decline": "bg-yellow-100 text-yellow-700",
}

export default function DashboardClient({
  articles,
  lastUpdated,
}: {
  articles: Article[]
  lastUpdated: string
}) {
  const [selected, setSelected] = useState<Article | null>(null)

  return (
    <div className="px-8 py-10 bg-neutral-50 min-h-screen">

      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-semibold">
          Kinage Intelligence
        </h1>
        <div className="text-sm text-neutral-500">
          Updated {lastUpdated}
        </div>
      </div>

      <div className="grid gap-6">
        {articles.map(article => (
          <div
            key={article.id}
            onClick={() => setSelected(article)}
            className="cursor-pointer bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
          >
            <div className="flex justify-between items-center mb-3">
              <span
                className={`text-xs px-3 py-1 rounded-full ${
                  domainColors[article.dominant_domain] || "bg-gray-100"
                }`}
              >
                {article.dominant_domain}
              </span>

              <span className="text-sm font-medium">
                {(article.score * 100).toFixed(0)}%
              </span>
            </div>

            <h2 className="text-lg font-medium leading-snug">
              {article.title}
            </h2>

            <p className="text-sm text-neutral-500 mt-3">
              {article.rss_source} • {article.published_at}
            </p>

            <div className="mt-4 w-full bg-neutral-200 rounded-full h-1">
              <div
                className="bg-black h-1 rounded-full"
                style={{ width: `${article.score * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <ArticleModal
          article={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

