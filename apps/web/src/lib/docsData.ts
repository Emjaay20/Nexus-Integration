export const helpDocs = [
    {
        id: 'doc-1',
        title: 'How to import a BOM (Bill of Materials)',
        content: `To import a Bill of Materials (BOM), navigate to the BOM Importer page from the sidebar. 
Click on the "Upload" zone or drag and drop your CSV or Excel file. 
Once uploaded, our wizard will ask you to map the columns in your file (like Part Number, Quantity, Description) to our standard schema.
Finally, click "Validate". The system will highlight any errors like missing quantities or invalid part numbers. If there are no errors, you can complete the import.`,
    },
    {
        id: 'doc-2',
        title: 'How to connect Shopify',
        content: `To connect your Shopify store, go to Settings > Integrations and select "Connect Shopify".
You will be redirected to the Shopify admin panel to authorize the Nexus Integration Hub.
Once authorized, we will automatically sync your products and orders in real-time using webhooks.
You can monitor the sync status in the Integration Hub dashboard.`,
    },
    {
        id: 'doc-3',
        title: 'What does a "Failure" status mean in the dashboard?',
        content: `A "Failure" status in the activity log means that an incoming webhook could not be processed successfully.
This usually happens if the destination API (like your ERP system) is down or timed out.
Our system automatically retries failed webhooks 3 times with exponential backoff.
If it succeeds on a retry, the status changes to "Recovered". If it fails all retries, it stays as "Failure" and may require manual intervention.`,
    },
    {
        id: 'doc-4',
        title: 'Where can I see Enablement Metrics?',
        content: `You can view your enablement metrics by navigating to the "Enablement Metrics" tab in the dashboard.
Here, you'll see charts for First Response Time, Time to Close, AI Chatbot Resolution Rate, and your overall Customer Satisfaction (CSAT) score.
These metrics help you understand how effectively your support channels are operating.`,
    }
];
