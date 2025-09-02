
# Pulse Analytics

Pulse Analytics is a lightweight, privacy-focused, and self-hostable pageview analytics system. It's designed to be simple to deploy and use, giving you essential insights into your website's traffic without relying on third-party services.

## Features

- **Lightweight Tracker:** A tiny (<1KB) JavaScript snippet to embed on your site.
- **Serverless Backend:** Built with serverless functions, ready to deploy on Vercel.
- **Flat-File Storage:** Uses a simple `db.json` file for data persistence (on the Vercel host).
- **React Dashboard:** A clean, modern dashboard to view your analytics.
- **Easy Deployment:** One-click deployment to Vercel.

---

## How It Works

1.  **Tracking Script (`tracker.js`):** You embed a small script tag on your website.
2.  **Data Collection:** On each page load, the script sends a POST request with pageview data (pathname, referrer, user agent) to the `/api/track` endpoint.
3.  **Data Storage:** The serverless function receives this data and appends it to a `db.json` file within the deployment's file system.
4.  **Dashboard:** The main web interface is a React application that fetches all tracked data from `/api/stats` and displays it in a user-friendly dashboard.

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) or a compatible package manager
- [Vercel CLI](https://vercel.com/docs/cli) (for local development that mimics the Vercel environment)

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <repo-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    This command starts the React app and the serverless API functions locally.
    ```bash
    vercel dev
    ```

Your dashboard will be available at `http://localhost:3000`.

---

## Deployment to Vercel

This project is optimized for deployment on [Vercel](https://vercel.com).

1.  **Push to a Git Repository:**
    Push your project to a GitHub, GitLab, or Bitbucket repository.

2.  **Import Project on Vercel:**
    - Log in to your Vercel account.
    - Click "Add New..." -> "Project".
    - Import the Git repository you just pushed.
    - Vercel should automatically detect it as a React project with Serverless Functions. No special build configuration is needed.

3.  **Deploy:**
    - Click the "Deploy" button. Vercel will build and deploy your application.
    - Once deployed, you will get a production URL (e.g., `https://your-app-name.vercel.app`).

**Important Note on Data Persistence:**
This application uses a JSON flat file (`data/db.json`) for storage. On Vercel's serverless environment, this file system is **ephemeral**. This means your data will be **wiped** every time you redeploy the application or if the serverless instance is recycled.

For **production use with persistent data**, you should upgrade the storage mechanism in `api/track.ts` and `api/stats.ts` to use a service like **Vercel KV**, **Vercel Blob**, or an external database (e.g., Supabase, PlanetScale).

---

## Usage: Adding the Tracker to Your Website

After deploying, you need to add the tracker script to the website(s) you want to monitor.

1.  **Get Your URL:**
    Your tracker script URL will be your Vercel deployment URL followed by `/tracker.js`.
    Example: `https://your-app-name.vercel.app/tracker.js`

2.  **Embed the Script:**
    Copy the following script tag and paste it inside the `<head>` section of your website's HTML.

    ```html
    <!-- Replace https://your-app-name.vercel.app with your actual deployment URL -->
    <script async defer src="https://your-app-name.vercel.app/tracker.js"></script>
    ```

That's it! The script will now track pageviews on your site, and you can view the stats on your Pulse Analytics dashboard.
