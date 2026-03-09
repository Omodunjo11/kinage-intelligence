import { getArticlesData } from "@/lib/articles";

export default async function DashboardPage() {
  const articles = await getArticlesData();

  return (
    <div>
      <h1>Dashboard</h1>
      {articles.map((a: any) => (
        <div key={a.id}>
          <h2>{a.title}</h2>
          <p>Final Score: {a.final_score}</p>
        </div>
      ))}
    </div>
  );
}