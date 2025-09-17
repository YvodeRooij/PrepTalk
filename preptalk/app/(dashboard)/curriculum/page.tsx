export default function CurriculumPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Curriculum</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Data Structures</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>75%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
            </div>
          </div>
          <ul className="text-sm space-y-1 text-gray-600">
            <li>✓ Arrays and Strings</li>
            <li>✓ Linked Lists</li>
            <li>✓ Stacks and Queues</li>
            <li className="text-blue-600">→ Trees and Graphs</li>
          </ul>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Algorithms</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>45%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{width: '45%'}}></div>
            </div>
          </div>
          <ul className="text-sm space-y-1 text-gray-600">
            <li>✓ Sorting Algorithms</li>
            <li className="text-blue-600">→ Binary Search</li>
            <li>Dynamic Programming</li>
            <li>Graph Algorithms</li>
          </ul>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">System Design</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>20%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{width: '20%'}}></div>
            </div>
          </div>
          <ul className="text-sm space-y-1 text-gray-600">
            <li className="text-blue-600">→ Scalability Basics</li>
            <li>Database Design</li>
            <li>Microservices</li>
            <li>Caching Strategies</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Recommended Next Steps</h2>
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Continue Trees and Graphs</h3>
          <p className="text-blue-700 mb-4">
            Complete your data structures foundation with binary trees, BSTs, and graph traversal algorithms.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Continue Learning
          </button>
        </div>
      </div>
    </div>
  );
}
