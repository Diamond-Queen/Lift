import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
    return res.status(400).json({ error: "Name, email, and phone are required" });
  }

  try {
    let prompt = "";

    if (type === "resume") {
      // Build prompt for structured resume
      prompt = `
Create a structured professional resume in JSON for ${name}.
Include:
- email: ${email}
- phone: ${phone}
- address: ${address || ""}
- linkedin: ${linkedin || ""}
- objective: ${objective || ""}
- experience: ${experience || ""} (return as array of {title, company, dates, details})
- education: ${education || ""} (return as array of {degree, school, dates})
- skills: ${skills || ""} (return as array)
- certifications: ${certifications || ""} (return as array)

Respond ONLY with valid JSON matching this structure:
{
  "name": string,
  "email": string,
  "phone": string,
  "address": string,
  "linkedin": string,
  "objective": string,
  "experience": [{ "title": "", "company": "", "dates": "", "details": "" }],
  "education": [{ "degree": "", "school": "", "dates": "" }],
  "skills": [],
  "certifications": []
}
      `;
    } else {
      // Cover letter prompt
      prompt = `
Write a professional cover letter in JSON for ${name}.
Include:
- recipient: ${recipient || ""}
- position: ${position || ""}
- paragraphs: ${paragraphs || ""} (return as array of strings)

Respond ONLY with valid JSON:
{
  "name": string,
  "recipient": string,
  "position": string,
  "paragraphs": []
}
      `;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let result = completion.choices[0].message.content;

    // Ensure valid JSON
    try {
      result = JSON.parse(result);
    } catch (err) {
      console.error("Failed to parse AI response as JSON:", err);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    res.status(200).json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
