import { getArticles } from "@/lib/articles"
import DashboardClient from "@/components/DashboardClient"

export default async function DashboardPage() {
  const articles = await getArticles()

  return (
    <DashboardClient
      articles={articles}
      lastUpdated={new Date().toLocaleString()}
    />
  )
}
