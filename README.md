This is a Next.js intelligence dashboard for Kinage signal monitoring.

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Primary dashboard route is `app/dashboard/page.tsx`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Data and Operations

Signal model and metric definitions:

- `docs/signal-operating-model.md`

Author enrichment and outreach workflow:

- `docs/enrichment-and-outreach-workflow.md`

Useful scripts:

```bash
# dry-run author scraping and write author activity snapshot
npm run authors:enrich

# persist scraped author values into data/ranked_chunks.json
npm run authors:enrich:write

# apply Kinage-specific intake profile and write curated_signals.json + curation_report.json
npm run signals:curate

# generate Clay candidate and HubSpot assignment queue payloads
npm run outreach:build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
