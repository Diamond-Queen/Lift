import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { name, experience, skills, type } = req.body;
  if (!name || !experience || !skills) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const prompt =
    type === "resume"
      ? `Create a professional resume for ${name} with experience: ${experience} and skills: ${skills}`
      : `Write a professional cover letter for ${name} with experience: ${experience} and skills: ${skills}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    res.status(200).json({ result: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
