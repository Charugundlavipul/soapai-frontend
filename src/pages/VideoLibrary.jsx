import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoLibrary from '../components/VideoLibrary';

export default function VideoLibraryPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 py-6">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
                <p className="text-gray-600">View and manage all your uploaded videos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Video Library Content */}
        <div className="max-w-7xl mx-auto">
          <VideoLibrary />
        </div>
      </main>
    </div>
  );
}

