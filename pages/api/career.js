import OpenAI from "openai";

// Initialize the OpenAI client. Using this structure ensures the client 
// securely looks for the OPENAI_API_KEY environment variable.
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
    objective, // Now used as "About Yourself/Career Direction"
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
      // PROMPT FOR RESUME GENERATION
      prompt = `
You are a professional resume writer. Your task is to generate a JSON object representing a polished resume based on the raw, unstructured user inputs provided below.

--- CRITICAL INSTRUCTION ---
1.  **Strict Output:** You MUST output only the JSON object. Do not include any commentary, markdown fence (e.g., \`\`\`json), or explanations.
2.  **Required Structure:** The JSON MUST strictly conform to the structure below.
3.  **Synthesis Allowed:** You ARE ALLOWED to synthesize a professional "objective" (summary) based on the "About Yourself/Career Direction" and "Education" inputs.
4.  **Skill Inference:** You ARE ALLOWED to infer and generate a list of professional skills based on the "About Yourself/Career Direction" and "Education" inputs if the raw "Skills" list is empty.
5.  **No Invention:** You MUST NOT invent any companies, job titles, schools, degrees, or certifications that are not present in the user's raw input. If input is missing for 'experience', 'education', or 'certifications', return an empty array [] for those fields.

--- RAW USER INPUT ---
Name: ${name}
Email: ${email}
Phone: ${phone}
Address: ${address || "N/A"}
LinkedIn/Portfolio: ${linkedin || "N/A"}
About Yourself/Career Direction (Source for Summary): ${objective || "N/A"}
Experience (Title | Company | Dates | Details per line): ${experience || "N/A"}
Education (Degree | School | Dates per line): ${education || "N/A"}
Skills (Comma separated list): ${skills || "N/A"}
Certifications (Comma separated list): ${certifications || "N/A"}

--- REQUIRED JSON FORMAT ---
{
  "name": "${name}",
  "email": "${email}",
  "phone": "${phone}",
  "address": "${address || ""}",
  "linkedin": "${linkedin || ""}",
  "objective": "A compelling, synthesized professional summary goes here.",
  "experience": [
    { "title": "Job Title", "company": "Company Name", "dates": "Start - End Date", "details": "Key accomplishment or responsibility." }
  ],
  "education": [
    { "degree": "Degree/Major", "school": "Institution Name", "dates": "Start - End Date" }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "certifications": ["Certification 1", "Certification 2"]
}
      `;
    } else {
      // PROMPT FOR COVER LETTER GENERATION
      prompt = `
You are a professional correspondent. Your task is to generate a JSON object representing a formal cover letter based on the raw, unstructured user inputs provided below.

--- CRITICAL INSTRUCTION ---
1.  **Strict Output:** You MUST output only the JSON object. Do not include any commentary or explanations.
2.  **Required Structure:** The JSON MUST strictly conform to the structure below.
3.  **Content:** Write a professional cover letter, using the raw 'Experience, Skills, and Achievements' as the basis for the body paragraphs. Do NOT invent content not related to the raw input.
4.  **Blank Check:** If the raw 'Experience, Skills, and Achievements' input is missing ("N/A"), generate a brief, standard three-paragraph template focusing on the recipient and position.

--- RAW USER INPUT ---
Name: ${name}
Recipient Name/Company: ${recipient || "N/A"}
Position Applied For: ${position || "N/A"}
Experience, Skills, and Achievements (Source for body paragraphs): ${paragraphs || "N/A"}

--- REQUIRED JSON FORMAT ---
{
  "name": "${name}",
  "recipient": "${recipient || ""}",
  "position": "${position || ""}",
  "paragraphs": [
    "This is the first paragraph introducing the applicant and role.",
    "This is the second paragraph detailing relevant skills and experience.",
    "This is the closing paragraph expressing enthusiasm and call to action."
  ]
}
      `;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      // CRITICAL: Force the model to output a JSON object only
      response_format: { type: "json_object" } 
    });

    let raw = completion.choices?.[0]?.message?.content?.trim();

    // Safely extract JSON object using regex as a fallback guardrail
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

    // Always send structured object
    res.status(200).json({ result });

  } catch (err) {
    // Log the detailed error from OpenAI for debugging
    console.error("OpenAI API error:", err);
    // Send a user-friendly error message
    res.status(500).json({ error: "Failed to generate content. Please check your API key, then try again." });
  }
}