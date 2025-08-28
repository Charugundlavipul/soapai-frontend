import { useState, useEffect } from 'react';
import { Play, Download, Trash2, Eye, Calendar, Clock } from 'lucide-react';
import api from '../services/api';

export default function VideoLibrary() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/videos');
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setShowPlayer(true);
  };

  const handleDelete = async (videoId) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await api.delete(`/videos/${videoId}`);
        fetchVideos(); // Refresh the list
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('Failed to delete video');
      }
    }
  };

  const handleDownload = (video) => {
    // Create a temporary link to download the video
    const link = document.createElement('a');
    link.href = video.fileUrl;
    link.download = video.title || 'video';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-gray-600">Loading videos...</span>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No videos uploaded yet</h3>
        <p className="text-gray-500">Upload your first video to get started!</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Video Library</h2>
        <p className="text-gray-600">Manage and view all your uploaded videos</p>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <div key={video._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Video Thumbnail */}
            <div className="relative aspect-video bg-gray-100">
              <video
                src={video.fileUrl}
                className="w-full h-full object-cover"
                preload="metadata"
                onLoadedMetadata={(e) => {
                  // Store duration for display
                  if (e.target.duration) {
                    video.duration = e.target.duration;
                  }
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleVideoClick(video)}
                  className="bg-white bg-opacity-90 rounded-full p-3 hover:bg-opacity-100 transition-all"
                >
                  <Play className="w-6 h-6 text-gray-800" fill="currentColor" />
                </button>
              </div>
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {formatDuration(video.duration)}
              </div>
            </div>

            {/* Video Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {video.title || 'Untitled Video'}
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(video.createdAt)}</span>
                </div>
                
                {video.goals && video.goals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {video.goals.slice(0, 3).map((goal, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {goal}
                      </span>
                    ))}
                    {video.goals.length > 3 && (
                      <span className="text-xs text-gray-500">+{video.goals.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleVideoClick(video)}
                  className="flex-1 bg-primary text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                
                <button
                  onClick={() => handleDownload(video)}
                  className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                  title="Download video"
                >
                  <Download className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleDelete(video._id)}
                  className="bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                  title="Delete video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Player Modal */}
      {showPlayer && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{selectedVideo.title || 'Video Player'}</h3>
              <button
                onClick={() => setShowPlayer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <video
                src={selectedVideo.fileUrl}
                controls
                className="w-full rounded-lg"
                autoPlay
              >
                Your browser does not support the video tag.
              </video>
              
              <div className="mt-4 space-y-2">
                <p><strong>Title:</strong> {selectedVideo.title || 'Untitled'}</p>
                <p><strong>Uploaded:</strong> {formatDate(selectedVideo.createdAt)}</p>
                {selectedVideo.notes && <p><strong>Notes:</strong> {selectedVideo.notes}</p>}
                {selectedVideo.goals && selectedVideo.goals.length > 0 && (
                  <div>
                    <strong>Goals:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedVideo.goals.map((goal, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {goal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

