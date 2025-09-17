export default function InterviewsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Mock Interviews</h1>
      
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
          <p className="text-gray-600 mb-4">
            Jump into a practice interview session based on your skill level and preferences.
          </p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 w-full">
            Start Interview
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Interview Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Sessions:</span>
              <span className="font-semibold">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Score:</span>
              <span className="font-semibold text-green-600">78%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Session:</span>
              <span className="font-semibold">2 days ago</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Recent Interview Sessions</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold">Data Structures & Algorithms</h3>
                <p className="text-sm text-gray-600">December 15, 2024 • 45 minutes</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">82%</div>
                <div className="text-sm text-gray-500">Strong performance</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold">System Design</h3>
                <p className="text-sm text-gray-600">December 13, 2024 • 60 minutes</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-yellow-600">74%</div>
                <div className="text-sm text-gray-500">Good effort</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold">Behavioral Questions</h3>
                <p className="text-sm text-gray-600">December 10, 2024 • 30 minutes</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">88%</div>
                <div className="text-sm text-gray-500">Excellent</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
