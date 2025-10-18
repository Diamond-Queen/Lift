import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-600 text-white p-4">
      <h1 className="text-5xl font-bold mb-8">Lift</h1>
      <p className="text-xl mb-12">Study smarter. Prepare faster.</p>
      <div className="flex space-x-6">
        <Link href="/notes">
          <button className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100">
            Lift Notes
          </button>
        </Link>
        <Link href="/career">
          <button className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100">
            Lift Career
          </button>
        </Link>
      </div>
    </div>
  );
}
