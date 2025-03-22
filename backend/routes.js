import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { Dataset, Response } from "./models.js";
import axios from "axios";
import dotenv from "dotenv";
import { emitEvaluationUpdate } from "./server.js";
import { evaluationQueue } from './services/EvaluationQueue.js';

dotenv.config();

const router = express.Router();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Handle CSV File Upload
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
          const possible_answers = JSON.parse(data.possible_answers.replace(/'/g, '"'));
          results.push({
            question: data.question,
            possible_answers,
            reference_answer: possible_answers[0] || "Yes.",
            category: data.category || "Unknown",
            difficulty: parseInt(data.difficulty, 10) || 0,
          });
        } catch (error) {
          console.error("❌ Error parsing row:", error);
        }
      })
      .on("end", async () => {
        const savedData = await Dataset.insertMany(results);
        res.json({ message: "Dataset uploaded successfully", data: savedData });
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch All Dataset Entries
router.get("/dataset", async (req, res) => {
  try {
    const dataset = await Dataset.find();
    res.json(dataset);
  } catch (error) {
    console.error("❌ Error fetching dataset:", error);
    res.status(500).json({ error: "Failed to fetch dataset" });
  }
});

// Evaluate Endpoint with Queue Integration
router.post("/evaluate", async (req, res) => {
  try {
    const dataset = await Dataset.find().lean();
    
    if (dataset.length === 0) {
      return res.status(400).json({ error: "No dataset available" });
    }

    const job = await evaluationQueue.addBatch(dataset);
    
    res.json({ 
      message: "Evaluation started",
      jobId: job.id,
      totalQuestions: dataset.length
    });
  } catch (error) {
    console.error("Evaluation failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Evaluation Status Endpoint
router.get("/evaluate/status/:jobId", async (req, res) => {
  try {
    const status = await evaluationQueue.getJobStatus(req.params.jobId);
    res.json(status);
  } catch (error) {
    res.status(404).json({ error: "Job not found" });
  }
});

// Fetch Evaluation Results
router.get("/results", async (req, res) => {
  try {
    const results = await Response.find();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LLM Call Function
const callLLM = async (model, prompt, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 100
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

// Response Evaluation Function
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

    if (!response.data.choices || response.data.choices.length === 0) {
      return { correctness: 0, faithfulness: 0 };
    }

    const scores = response.data.choices[0]?.message?.content?.match(/\d+/g)?.map(Number);
    return {
      correctness: Math.min(10, Math.max(0, scores[0] || 0)),
      faithfulness: Math.min(10, Math.max(0, scores[1] || 0))
    };
  } catch (error) {
    return { correctness: 0, faithfulness: 0 };
  }
};

export default router;