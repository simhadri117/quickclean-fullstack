import React, { useState, useEffect } from 'react';
import { ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

interface MetabaseEmbedProps {
  dashboardId: string | number;
  height?: string | number;
  className?: string;
}

const MetabaseEmbed: React.FC<MetabaseEmbedProps> = ({ 
  dashboardId, 
  height = '600px',
  className = '' 
}) => {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmbedUrl = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/metabase/dashboard-url/${dashboardId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch embedding URL');
        }

        const data = await response.json();
        setEmbedUrl(data.url);
      } catch (err: any) {
        console.error('Metabase Embed Error:', err);
        setError(err.message || 'Could not load the dashboard. Please ensure Metabase is configured correctly.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmbedUrl();
  }, [dashboardId]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 ${className}`} style={{ height }}>
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-gray-500 font-bold">Synchronizing with Metabase Intel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-red-50 rounded-[32px] border border-red-100 p-8 text-center ${className}`} style={{ height }}>
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h4 className="text-lg font-black text-red-900 mb-2">Connection Interrupted</h4>
        <p className="text-red-700 text-sm max-w-md mx-auto mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!embedUrl) return null;

  return (
    <div className={`relative overflow-hidden rounded-[32px] bg-white border border-gray-100 shadow-sm ${className}`} style={{ height }}>
      <iframe
        src={embedUrl}
        frameBorder="0"
        width="100%"
        height="100%"
        allowTransparency
        title={`Metabase Dashboard ${dashboardId}`}
        className="w-full h-full"
      />
      
      <div className="absolute top-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
        <a 
          href={embedUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 bg-white/80 backdrop-blur-md rounded-lg shadow-lg text-gray-600 hover:text-primary transition-colors"
          title="Open in new tab"
        >
          <ExternalLink size={18} />
        </a>
      </div>
    </div>
  );
};

export default MetabaseEmbed;
