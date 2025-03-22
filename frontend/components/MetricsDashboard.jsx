"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const processData = (evaluations) => {
  const aggregates = {
    deepseek: { correctness: 0, faithfulness: 0, count: 0 },
    qwen: { correctness: 0, faithfulness: 0, count: 0 }
  };

  const scoreDistribution = Array.from({ length: 11 }, (_, i) => ({
    score: i,
    deepseekCorrectness: 0,
    qwenCorrectness: 0,
    deepseekFaithfulness: 0,
    qwenFaithfulness: 0,
  }));

  evaluations.forEach(evalData => {
    // Aggregate averages
    aggregates.deepseek.correctness += evalData.correctness1;
    aggregates.deepseek.faithfulness += evalData.faithfulness1;
    aggregates.deepseek.count++;
    
    aggregates.qwen.correctness += evalData.correctness2;
    aggregates.qwen.faithfulness += evalData.faithfulness2;
    aggregates.qwen.count++;

    // Score distribution
    scoreDistribution[evalData.correctness1].deepseekCorrectness++;
    scoreDistribution[evalData.correctness2].qwenCorrectness++;
    scoreDistribution[evalData.faithfulness1].deepseekFaithfulness++;
    scoreDistribution[evalData.faithfulness2].qwenFaithfulness++;
  });

  return {
    radarData: [
      { metric: 'Correctness', deepseek: aggregates.deepseek.correctness / aggregates.deepseek.count, qwen: aggregates.qwen.correctness / aggregates.qwen.count },
      { metric: 'Faithfulness', deepseek: aggregates.deepseek.faithfulness / aggregates.deepseek.count, qwen: aggregates.qwen.faithfulness / aggregates.qwen.count },
    ],
    barData: [
      { name: 'DeepSeek', Correctness: aggregates.deepseek.correctness / aggregates.deepseek.count, Faithfulness: aggregates.deepseek.faithfulness / aggregates.deepseek.count },
      { name: 'Qwen', Correctness: aggregates.qwen.correctness / aggregates.qwen.count, Faithfulness: aggregates.qwen.faithfulness / aggregates.qwen.count },
    ],
    lineData: scoreDistribution,
  };
};

export const MetricsDashboard = ({ evaluations }) => {
  if (!evaluations?.length) return null;
  
  const { radarData, barData, lineData } = processData(evaluations);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Evaluation Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="distribution">Score Distribution</TabsTrigger>
            <TabsTrigger value="comparison">Model Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Average Scores</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Correctness" fill="#2563eb" />
                    <Bar dataKey="Faithfulness" fill="#60a5fa" />
                  </BarChart>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Metric Comparison</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <RadarChart outerRadius={90} data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} />
                    <Radar name="DeepSeek" dataKey="deepseek" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
                    <Radar name="Qwen" dataKey="qwen" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.6} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="distribution">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Score Frequency</CardTitle>
              </CardHeader>
              <CardContent className="h-96">
                <LineChart width={800} height={400} data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="score" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="deepseekCorrectness" stroke="#2563eb" name="DeepSeek Correctness" />
                  <Line type="monotone" dataKey="qwenCorrectness" stroke="#60a5fa" name="Qwen Correctness" />
                  <Line type="monotone" dataKey="deepseekFaithfulness" stroke="#1e3a8a" name="DeepSeek Faithfulness" />
                  <Line type="monotone" dataKey="qwenFaithfulness" stroke="#1d4ed8" name="Qwen Faithfulness" />
                </LineChart>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <div className="grid md:grid-cols-2 gap-8 ">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm ">Correctness Comparison</CardTitle>
                </CardHeader>
                <CardContent className="h-64 ">
                  <BarChart data={evaluations}>
                    <XAxis dataKey="question" hide />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="correctness1" fill="#2563eb" name="DeepSeek" />
                    <Bar dataKey="correctness2" fill="#60a5fa" name="Qwen" />
                  </BarChart>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Faithfulness Comparison</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <BarChart data={evaluations}>
                    <XAxis dataKey="question" hide />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="faithfulness1" fill="#2563eb" name="DeepSeek" />
                    <Bar dataKey="faithfulness2" fill="#60a5fa" name="Qwen" />
                  </BarChart>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};