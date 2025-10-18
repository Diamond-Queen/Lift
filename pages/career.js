import { useState } from "react";

export default function Career() {
  const [name, setName] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [type, setType] = useState("resume");
  const [result, setResult] = useState("");

  const handleGenerate = async () => {
    const res = await fetch("/api/career", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, experience, skills, type }),
    });
    const data = await res.json();
    setResult(data.result);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Lift Career</h1>
      <input
        type="text"
        placeholder="Name"
        className="w-full border rounded p-2 mb-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        placeholder="Experience"
        className="w-full border rounded p-2 mb-2"
        rows={3}
        value={experience}
        onChange={(e) => setExperience(e.target.value)}
      />
      <textarea
        placeholder="Skills"
        className="w-full border rounded p-2 mb-2"
        rows={3}
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
      />
      <select
        className="w-full border rounded p-2 mb-4"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="resume">Resume</option>
        <option value="cover">Cover Letter</option>
      </select>
      <button
        className="px-6 py-3 bg-purple-500 text-white rounded hover:bg-purple-600"
        onClick={handleGenerate}
      >
        Generate
      </button>

      {result && (
        <div className="mt-6 p-4 border rounded bg-gray-50 text-black">
          <h2 className="font-bold mb-2">Result</h2>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
