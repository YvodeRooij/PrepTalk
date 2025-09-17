export default function CreditsPurchasePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Purchase Credits</h1>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-6">Choose a credit package</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Starter Package</h3>
                  <p className="text-gray-600">25 credits - Perfect for getting started</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">$9.99</div>
                  <div className="text-sm text-gray-500">$0.40 per credit</div>
                </div>
              </div>
            </div>
            <div className="border-2 border-blue-500 rounded-lg p-4 hover:bg-blue-50 cursor-pointer">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-blue-600">Professional Package</h3>
                  <p className="text-gray-600">60 credits - Most popular choice</p>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Best Value</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">$19.99</div>
                  <div className="text-sm text-gray-500">$0.33 per credit</div>
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Enterprise Package</h3>
                  <p className="text-gray-600">150 credits - For power users</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">$39.99</div>
                  <div className="text-sm text-gray-500">$0.27 per credit</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700">
              Continue to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
