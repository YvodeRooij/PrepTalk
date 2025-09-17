export default function StartInterviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Start New Interview</h1>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-6">Interview Configuration</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interview Type
              </label>
              <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>Technical - Data Structures & Algorithms</option>
                <option>System Design</option>
                <option>Behavioral</option>
                <option>Mixed Interview</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button className="p-3 border-2 border-green-300 bg-green-50 text-green-700 rounded-lg font-medium">
                  Easy
                </button>
                <button className="p-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-yellow-300 hover:bg-yellow-50">
                  Medium
                </button>
                <button className="p-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-red-300 hover:bg-red-50">
                  Hard
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration
              </label>
              <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>30 minutes</option>
                <option>45 minutes</option>
                <option>60 minutes</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Focus (Optional)
              </label>
              <input 
                type="text" 
                placeholder="e.g., Google, Meta, Amazon"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Cost: 3 credits</span>
              <span className="text-sm text-gray-600">Available: 50 credits</span>
            </div>
            <button className="w-full bg-blue-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-700">
              Start Interview (3 Credits)
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <a href="/dashboard/interviews" className="text-blue-600 hover:underline">
            ← Back to Interviews
          </a>
        </div>
      </div>
    </div>
  );
}
