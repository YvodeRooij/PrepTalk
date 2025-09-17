export default function CreditsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Credits</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Current Balance</h2>
          <div className="text-4xl font-bold text-blue-600 mb-2">50</div>
          <p className="text-gray-600">Credits available</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Usage Stats</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>This month:</span>
              <span className="font-medium">15 credits</span>
            </div>
            <div className="flex justify-between">
              <span>Total used:</span>
              <span className="font-medium">75 credits</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Purchase More Credits</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <h3 className="font-semibold">Starter</h3>
            <div className="text-2xl font-bold">$9.99</div>
            <p className="text-sm text-gray-600">25 credits</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <h3 className="font-semibold">Professional</h3>
            <div className="text-2xl font-bold">$19.99</div>
            <p className="text-sm text-gray-600">60 credits</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <h3 className="font-semibold">Enterprise</h3>
            <div className="text-2xl font-bold">$39.99</div>
            <p className="text-sm text-gray-600">150 credits</p>
          </div>
        </div>
      </div>
    </div>
  );
}
