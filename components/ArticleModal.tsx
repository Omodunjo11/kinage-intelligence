"use client"

import { useEffect } from "react"

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

export default function ArticleModal({
  article,
  onClose,
}: {
  article: Article
  onClose: () => void
}) {

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">

      <div className="relative bg-white rounded-3xl shadow-xl max-w-3xl w-full p-10 max-h-[85vh] overflow-y-auto">

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-neutral-400 hover:text-black"
        >
          ✕
        </button>

        <div className="mb-6 flex justify-between items-center">
          <span className="text-xs px-3 py-1 rounded-full bg-neutral-100">
            {article.dominant_domain}
          </span>
        </div>

        <h2 className="text-2xl font-semibold mb-2">
          {article.title}
        </h2>

        <div className="text-sm text-neutral-500 mb-6">
          {article.rss_source} • {article.published_at}
        </div>

        <div className="mb-6">
          <div className="text-sm font-medium mb-2">
            Intelligence Score {(article.score * 100).toFixed(0)}%
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="bg-black h-2 rounded-full"
              style={{ width: `${article.score * 100}%` }}
            />
          </div>
        </div>

        <div className="mb-8 text-neutral-700 leading-relaxed">
          {article.summary}
        </div>

        {article.why_it_matters && (
          <div className="mb-8 text-neutral-600 italic">
            {article.why_it_matters}
          </div>
        )}

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-5 py-3 bg-black text-white rounded-xl"
        >
          Read Full Article
        </a>

      </div>
    </div>
  )
}

