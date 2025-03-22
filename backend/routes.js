import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { Dataset, Response } from "./models.js";
import axios from "axios";
import dotenv from "dotenv";
import { emitEvaluationUpdate } from "./server.js";

dotenv.config();

const router = express.Router();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });



router.post("/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
  
      const results = [];
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => {
          try {
            // Validate required fields
            if (!data.question || !data.possible_answers || !data.category || !data.difficulty) {
              console.warn("Skipping invalid row:", data);
              return;
            }
  
            // Safely parse possible_answers
            const possibleAnswers = data.possible_answers
              .replace(/'/g, '"') // Handle single quotes
              .replace(/^\[|\]$/g, ''); // Remove square brackets
  
            const parsedAnswers = possibleAnswers.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
            
            results.push({
              question: data.question.trim(),
              possible_answers: parsedAnswers,
              reference_answer: parsedAnswers[0] || "Yes.",
              category: data.category.trim(),
              difficulty: parseInt(data.difficulty, 10) || 0,
            });
          } catch (error) {
            console.error("Error processing row:", error.message);
            console.log("Problematic row data:", data);
          }
        })
        .on("end", async () => {
          try {
            if (results.length === 0) {
              return res.status(400).json({ error: "No valid data found in CSV" });
            }
            
            const savedData = await Dataset.insertMany(results);
            res.json({ 
              message: "Dataset uploaded successfully",
              validRows: savedData.length,
              totalRows: results.length
            });
          } catch (error) {
            console.error("Database insertion error:", error);
            res.status(500).json({ error: "Failed to save dataset" });
          }
        });
    } catch (error) {
      console.error("Upload failed:", error);
      res.status(500).json({ error: "File processing failed" });
    }
  });


router.get("/dataset", async (req, res) => {
  try {
    const dataset = await Dataset.find();
    res.json(dataset);
  } catch (error) {
    console.error("Error fetching dataset:", error);
    res.status(500).json({ error: "Failed to fetch dataset" });
  }
});


router.post("/evaluate", async (req, res) => {
    try {
      const dataset = await Dataset.find();
      
      for (const data of dataset) {
        const { question, category, difficulty, reference_answer } = data;
        const prompt = `Answer with "Yes" or "No": ${question}`;
  
        // Get responses with error handling
        const [deepseekResult, qwenResult] = await Promise.allSettled([
          callLLM("deepseek/deepseek-r1-zero:free", prompt),
          callLLM("qwen/qwq-32b:free", prompt)
        ]);
  
        // Get evaluations with error handling
        const [deepseekEval, qwenEval] = await Promise.allSettled([
          evaluateResponse(question, deepseekResult.value || "", reference_answer),
          evaluateResponse(question, qwenResult.value || "", reference_answer)
        ]);
  
        // Build response document with fallbacks
        const responseDoc = {
          question,
          category,
          difficulty,
          reference_answer,
          model1: "DeepSeek-R1-Zero",
          response1: deepseekResult.value || "API error",
          correctness1: deepseekEval.value?.correctness || 0,
          faithfulness1: deepseekEval.value?.faithfulness || 0,
          model2: "Qwen-32B",
          response2: qwenResult.value || "API error",
          correctness2: qwenEval.value?.correctness || 0,
          faithfulness2: qwenEval.value?.faithfulness || 0
        };
  
        // Save with error tolerance
        try {
          const saved = await Response.create(responseDoc);
          emitEvaluationUpdate(saved.toObject());
        } catch (saveError) {
          console.error("Failed to save response:", saveError.message);
        }
        
        await delay(1000); // Rate limit buffer
      }
  
      res.json({ message: "Evaluation completed" });
    } catch (error) {
      console.error("Evaluation failed:", error);
      res.status(500).json({ error: "Evaluation process failed" });
    }
  });


router.get("/results", async (req, res) => {
  try {
    const results = await Response.find();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const callLLM = async (model, prompt, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
              "X-Title": process.env.SITE_NAME || "LLM Evaluator",
              "Content-Type": "application/json"
            },
            timeout: 30000
          }
        );
  
        if (response.data.error?.code === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`⚠️ Rate limited. Waiting ${waitTime}ms...`);
          await delay(waitTime);
          continue;
        }
  
        return response.data.choices[0]?.message?.content?.trim() || "No response";
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        if (attempt === retries) return "API error";
        await delay(1000 * attempt);
      }
    }
  };
  


const evaluateResponse = async (question, answer, reference) => {
  const evaluationPrompt = `Evaluate the following response to the question: ${question}\n\nResponse: ${answer}\n\nReference Answer: ${reference}\n\nRate correctness (1-10) and faithfulness (1-10).`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      { model: "google/gemma-3-12b-it:free", messages: [{ role: "user", content: evaluationPrompt }] },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
          "X-Title": process.env.SITE_NAME || "LLM Evaluator",
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`Evaluation API Response:`, response.data);

    // ✅ Handle missing or invalid responses
    if (!response.data.choices || response.data.choices.length === 0) {
      console.error("Evaluation API returned an empty response.");
      return { correctness: 0, faithfulness: 0 };
    }

    const scores = response.data.choices[0]?.message?.content?.match(/\d+/g)?.map(Number);
    if (!scores || scores.length < 2) {
      console.error("Invalid evaluation response format.");
      return { correctness: 0, faithfulness: 0 };
    }

    return { correctness: scores[0] || 0, faithfulness: scores[1] || 0 };
  } catch (error) {
    console.error("Evaluation API Error:", error.response?.data || error.message);
    return { correctness: 0, faithfulness: 0 };
  }
};

// ✅ Export Router
export default router;