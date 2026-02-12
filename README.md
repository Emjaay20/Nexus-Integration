# Nexus-Integration

**Nexus-Integration** is a next-generation "Supply Chain Operating System" designed to centralize, monitor, and manage the complex web of data flows between ERPs, CRMs, and PLM systems.

![Nexus Dashboard Screenshot](https://raw.githubusercontent.com/Emjaay20/Nexus-Integration/main/public/dashboard-preview.png)

## 🚀 The Mission
Modern hardware companies struggle with "data silos." Engineers use one tool, procurement uses another, and sales uses a third. Nexus acts as the "Air Traffic Control" tower, connecting these systems via real-time webhooks and providing a single pane of glass for monitoring system health.

## ✨ Key Features

### 1. **Integration Hub (Real-Time)**
*   **Live Monitoring**: Watch data synchronize between Shopify, Salesforce, and SAP in real-time.
*   **Green/Red Status**: Instantly identify broken connections.
*   **Activity Logs**: A permanent, searchable audit trail of every data packet.
*   **Powered by**: Neon (PostgreSQL) + Pusher (WebSockets).

### 2. **BOM Importer**
*   **Intelligent Parsing**: Upload messy Excel/CSV Bill of Materials.
*   **Validation**: Automatically flags missing part numbers or quantity errors.

### 3. **Developer API**
*   **Webhook Ingestion**: A robust API to receive signals from any external tool.
*   **Interactive Playground**: A built-in tool for developers to test integrations without writing code.

---

## 🛠️ How It Works (Architecture)

1.  **Trigger**: An external system (e.g., Shopify) sends a webhook to `/api/integrations/webhook/trigger`.
2.  **Process**: Nexus validates the payload and logs it to the **Neon Database**.
3.  **Broadcast**: The server instantly pushes a `new-activity` event via **Pusher**.
4.  **React**: The **Dashboard** subscribes to this event and updates the UI immediately (no page refresh required).

---

## 🏁 Getting Started

### Prerequisites
*   Node.js 18+
*   A **Neon** Database URL
*   A **Pusher** Account (App ID, Key, Secret, Cluster)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Emjaay20/Nexus-Integration.git
    cd Nexus-Integration
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file:
    ```env
    DATABASE_URL="your_neon_postgres_url"
    PUSHER_APP_ID="your_app_id"
    NEXT_PUBLIC_PUSHER_KEY="your_key"
    PUSHER_SECRET="your_secret"
    NEXT_PUBLIC_PUSHER_CLUSTER="your_cluster"
    ```

4.  **Run the App**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing the System

You don't need a real Shopify store to test Nexus. We built a **Simulator**.

1.  Navigate to **Developer > API Playground** (`/developer/playground`).
2.  Click **"Load Failure Example"**.
3.  Click **"Send Request"**.
4.  Navigate to **Integration Hub**. You will see the "E-Commerce Sync" card turn **Red (Error)** instantly.

---

## 🏗️ Built With
*   **Framework**: Next.js 16 (App Router)
*   **Database**: Neon (Serverless PostgreSQL)
*   **Real-Time**: Pusher
*   **Styling**: Tailwind CSS
*   **Language**: TypeScript

---

*This project acts as a portfolio demonstration for a Forward Deployed Engineer role, showcasing full-stack capabilities from database design to real-time UI.*
