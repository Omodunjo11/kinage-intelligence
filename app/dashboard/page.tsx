async function getArticles() {
    const res = await fetch("http://localhost:3000/api/articles", {
      cache: "no-store",
    });
  
    if (!res.ok) {
      throw new Error("API failed");
    }
  
    return res.json();
  }
  
  export default async function DashboardPage() {
    const articles = await getArticles();
  
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