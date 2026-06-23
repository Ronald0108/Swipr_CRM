import Link from 'next/link';

export default function IntegrationsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Integrations</h1>
        <p className="text-gray-400 text-sm">Manage your CRM connections and data sync settings.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HubSpot Card */}
        <div className="border border-[#1f1f2e] p-6 rounded-2xl bg-[#13131a]">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">HubSpot</h2>
            <div className="bg-[#ff7a59]/10 text-[#ff7a59] text-xs px-2 py-1 rounded-md font-medium">
              Active
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-6 min-h-[40px]">
            Connect your HubSpot CRM to start pulling leads and syncing call activity seamlessly.
          </p>
          
          <Link 
            href="/api/auth/hubspot" 
            className="inline-flex items-center justify-center bg-[#ff7a59] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#ff7a59]/90 transition-colors w-full sm:w-auto"
          >
            Connect HubSpot
          </Link>
        </div>

        {/* Salesforce Card (Coming Soon) */}
        <div className="border border-[#1f1f2e] p-6 rounded-2xl bg-[#0a0a0f] opacity-60">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Salesforce</h2>
            <div className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded-md font-medium">
              Coming Soon
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-6 min-h-[40px]">
            Sync contacts, accounts, and opportunities natively with your Salesforce instance.
          </p>
          
          <button 
            disabled
            className="inline-flex items-center justify-center bg-[#1a1a24] text-gray-500 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-not-allowed w-full sm:w-auto border border-[#1f1f2e]"
          >
            Connect Salesforce
          </button>
        </div>
      </div>
    </div>
  );
}
