import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const {
    type,
    name,
    email,
    phone,
    address,
    linkedin,
    objective,
    experience,
    education,
    skills,
    certifications,
    recipient,
    position,
    paragraphs,
  } = req.body;

  if (!name || !email || !phone) {
    return res
      .status(400)
      .json({ error: "Name, email, and phone are required." });
  }

  try {
    let prompt;

    if (type === "resume") {
      prompt = `
Create a clean, professional resume in strict JSON format for ${name}.
Include all of these fields (empty if missing):

{
  "name": "${name}",
  "email": "${email}",
  "phone": "${phone}",
  "address": "${address || ""}",
  "linkedin": "${linkedin || ""}",
  "objective": "${objective || ""}",
  "experience": [
    { "title": "", "company": "", "dates": "", "details": "" }
  ],
  "education": [
    { "degree": "", "school": "", "dates": "" }
  ],
  "skills": [],
  "certifications": []
}

Populate with short, realistic content that fits a modern printable resume.
Only output JSON — no commentary, no markdown, no explanations.
      `;
    } else {
      prompt = `
Write a formal cover letter for ${name} as valid JSON:
{
  "name": "${name}",
  "recipient": "${recipient || ""}",
  "position": "${position || ""}",
  "paragraphs": []
}

Each paragraph should be a single string in the array.
Only output JSON — no markdown or explanations.
      `;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    let raw = completion.choices?.[0]?.message?.content?.trim();

    // Try to extract JSON safely, even if extra text comes
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON detected in response:", raw);
      return res.status(500).json({ error: "Invalid AI response format" });
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse JSON:", parseErr, raw);
      return res.status(500).json({ error: "Failed to parse AI JSON" });
    }

    // ✅ Always send structured object
    res.status(200).json({ result });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: err.message });
  }
}
