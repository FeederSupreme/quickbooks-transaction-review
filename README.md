# QuickBooks Transaction Review App

A simple Next.js web app for reviewing and editing existing transactions before syncing them back to QuickBooks.

## Features
- Review transaction rows in a table
- Edit description, amount, account, and GST code
- Apply a simple GST rule to selected transactions
- Save review changes through a local API endpoint
- Ready for QuickBooks OAuth integration later

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set your QuickBooks app credentials:

```env
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=https://quickbooks-transaction-review-production.up.railway.app/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox
```

3. Install and start the app:

```bash
npm install
npm run dev
```

4. Open the URL shown by the development server and click **Connect QuickBooks**.

If you see a QuickBooks auth error about `client_id`, make sure `QUICKBOOKS_CLIENT_ID` is set in `.env.local`.

## Railway Deployment

1. Create a new Railway project at https://railway.app.
2. Connect your GitHub repository or deploy directly from this directory.
3. Add the following environment variables in Railway:

```env
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=https://<your-railway-domain>/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox
```

4. In your QuickBooks app settings, add the same redirect URI.
5. Deploy the project and open the Railway URL.

> Important: keep `QUICKBOOKS_CLIENT_SECRET` private and do not commit it to source control.
