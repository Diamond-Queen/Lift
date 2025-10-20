import OpenAI from "openai";

// Initialize the OpenAI client
// It will automatically look for the OPENAI_API_KEY environment variable.
const client = new OpenAI({
  apiKey: "", // Leave empty; the environment will inject a key if available
});

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const {
    type, name, email, phone, address, linkedin, objective,
    // RAW STRINGS from frontend, which the LLM must now structure
    experience, education, skills, certifications, 
    // Cover letter fields
    recipient, position, paragraphs,
  } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Name, email, and phone are required." });
  }

  try {
    let prompt;

    // --- RESUME PROMPT (Uses: objective, experience, education, skills, certifications) ---
    if (type === "resume") {
      prompt = `
You are a professional resume writer specializing in converting messy, raw input into a structured, high-impact resume.

--- RAW USER INPUT ---
Objective/Summary: ${objective || "N/A"}
Experience (raw text): ${experience || "N/A"}
Education (raw text): ${education || "N/A"}
Skills (raw list): ${skills || "N/A"}
Certifications (raw list): ${certifications || "N/A"}
--- END RAW USER INPUT ---

*** CRITICAL INSTRUCTION: DO NOT INVENT CONTENT. ***
For any section where the RAW USER INPUT is "N/A", you MUST return the corresponding field in the JSON as an empty string ("") or an empty array ([]). For example, if 'Experience (raw text)' is 'N/A', the 'experience' array in the JSON MUST be []. Do not synthesize job titles, schools, or skills.

TASK: Using the raw data above, generate a professional resume structure for ${name} in the exact JSON format specified below.
1. The 'objective' field must be a compelling, synthesized summary.
2. The 'experience' details must be converted into short, bulleted achievements (use "\\n" to separate bullet points within the 'details' string).
3. The 'skills' and 'certifications' should be cleaned up and returned as arrays of strings.

REQUIRED JSON FORMAT:
{
  "name": "...",
  "email": "...",
  "phone": "...",
  "address": "...",
  "linkedin": "...",
  "objective": "A synthesized professional summary.",
  "experience": [
    { "title": "Job Title", "company": "Company Name", "dates": "20XX – 20XX", "details": "Key achievement 1\\nKey achievement 2" }
  ],
  "education": [
    { "degree": "Degree/Major", "school": "University Name", "dates": "20XX – 20XX" }
  ],
  "skills": ["Skill A", "Skill B"],
  "certifications": ["Certification Name"]
}
      `;
    } else {
    // --- COVER LETTER PROMPT (Uses: recipient, position, paragraphs) ---
      prompt = `
You are a professional hiring manager writing a highly persuasive cover letter.

--- CONTEXTUAL INPUT ---
Candidate Name: ${name}
Target Position: ${position} at ${recipient}
Key achievements/skills/experience provided by the user:
${paragraphs || "N/A"}
--- END CONTEXTUAL INPUT ---

*** CRITICAL INSTRUCTION: DO NOT INVENT PERSONAL ACHIEVEMENTS. ***
If the user's "Key achievements/skills/experience" input (paragraphs) is "N/A", you must write only a generic, professionally polite letter focused on the position and company. Do NOT invent specific job history, metrics, or detailed qualifications.

TASK: Write a formal cover letter incorporating the contextual input into cohesive paragraphs. The letter must contain an introduction, 1-3 body paragraphs, and a strong call-to-action conclusion. The output must be an array of strings representing each paragraph in the exact JSON format specified below.

REQUIRED JSON FORMAT:
{
  "name": "...",
  "recipient": "...",
  "position": "...",
  "paragraphs": [
    "Introduction paragraph.",
    "Body paragraph 1.",
    "Conclusion/Call to action."
  ]
}
      `;
    }

    // --- API CALL TO OPENAI ---
    const completion = await client.chat.completions.create({
        model: "gpt-4o-mini", // Recommended model for speed and structured JSON output
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        // Crucial for structured output: forces the model to return a valid JSON object
        response_format: { type: "json_object" } 
    });

    // The response is already guaranteed to be in JSON format
    const jsonText = completion.choices?.[0]?.message?.content?.trim();

    if (!jsonText) {
        throw new Error("AI did not return content.");
    }

    let result;
    try {
        result = JSON.parse(jsonText);
    } catch (parseErr) {
        console.error("Failed to parse AI JSON:", parseErr, jsonText);
        throw new Error("Failed to process AI response: Malformed JSON.");
    }

    res.status(200).json({ result });
  } catch (err) {
    // --- EDITED BLOCK: ADDED DETAILED ERROR LOGGING ---
    console.error("--- OpenAI API Call Failed ---");
    console.error("Full error object:", err);
    console.error("Error message:", err.message);

    // Provide a more descriptive error based on common OpenAI failure modes
    const clientErrorMessage = err.message.includes('authentication') 
        ? "Authentication failed. Check your OpenAI API key and permissions." 
        : err.message || "An unknown network or API error occurred.";
        
    res.status(500).json({ error: clientErrorMessage });
  }
}
