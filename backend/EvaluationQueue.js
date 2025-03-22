import { Queue } from 'bull';
import { Response } from '../models.js';
import { callLLM, evaluateResponse } from '../routes.js';
import { emitEvaluationUpdate } from '../server.js';

class EvaluationQueue {
  constructor() {
    this.queue = new Queue('evaluations', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      },
      limiter: {
        max: 5, // Max concurrent evaluations
        duration: 1000
      }
    });

    this.queue.process('evaluate', async (job) => {
      const { data, index, total } = job.data;
      try {
        const result = await this.processQuestion(data);
        job.progress(Math.round((index / total) * 100));
        return result;
      } catch (error) {
        throw new Error(`Question ${index} failed: ${error.message}`);
      }
    });
  }

  async processQuestion(data) {
    const { question, reference_answer, category, difficulty } = data;
    const prompt = `Answer with "Yes" or "No": ${question}`;

    const [deepseekResponse, qwenResponse] = await Promise.allSettled([
      callLLM("deepseek/deepseek-r1-zero:free", prompt),
      callLLM("qwen/qwq-32b:free", prompt)
    ]);

    const [deepseekEval, qwenEval] = await Promise.allSettled([
      evaluateResponse(question, deepseekResponse.value || "", reference_answer),
      evaluateResponse(question, qwenResponse.value || "", reference_answer)
    ]);

    const responseDoc = {
      question,
      category,
      difficulty,
      reference_answer,
      model1: "DeepSeek-R1-Zero",
      response1: deepseekResponse.value || "API error",
      correctness1: deepseekEval.value?.correctness || 0,
      faithfulness1: deepseekEval.value?.faithfulness || 0,
      model2: "Qwen-32B",
      response2: qwenResponse.value || "API error",
      correctness2: qwenEval.value?.correctness || 0,
      faithfulness2: qwenEval.value?.faithfulness || 0
    };

    const saved = await Response.create(responseDoc);
    emitEvaluationUpdate(saved.toObject());
    return saved;
  }

  async addBatch(dataset) {
    return this.queue.addBulk(
      dataset.map((data, index) => ({
        name: 'evaluate',
        data: { data, index, total: dataset.length }
      }))
    );
  }

  async getJobStatus(jobId) {
    const job = await this.queue.getJob(jobId);
    return {
      id: job.id,
      progress: job.progress(),
      status: await job.getState()
    };
  }
}

export const evaluationQueue = new EvaluationQueue();