"use client";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { BatchControls } from "@/components/BatchControls";
import { Button } from "./ui/button";

export function EvaluationTable() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchInfo, setBatchInfo] = useState({ jobId: null, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:5000/results");
        setEvaluations(res.data);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const socket = io("http://localhost:5000");
    socket.on("newEvaluation", (newEval) => {
      setEvaluations(prev => [newEval, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  const startEvaluation = async () => {
    try {
      const { data } = await axios.post("http://localhost:5000/api/evaluate");
      setBatchInfo({ jobId: data.jobId, total: data.totalQuestions });
    } catch (error) {
      console.error("Failed to start evaluation:", error);
    }
  };
  

  return (
    <div className="p-5">
      <div className="mb-8 space-y-4">
        {/* <Button onClick={startEvaluation} disabled={batchInfo.jobId}>
          {batchInfo.jobId ? 'Evaluation Running...' : 'Start Batch Evaluation'}
        </Button> */}
        {batchInfo.jobId && (
          <BatchControls jobId={batchInfo.jobId} totalQuestions={batchInfo.total} />
        )}
      </div>

      <MetricsDashboard evaluations={evaluations} />
      
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="w-full">
            <TableCaption>Live evaluation results</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>DeepSeek Response</TableHead>
                <TableHead>DeepSeek Scores</TableHead>
                <TableHead>Qwen Response</TableHead>
                <TableHead>Qwen Scores</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((evalData, index) => (
                <TableRow key={index}>
                  <TableCell className="max-w-[300px] truncate">{evalData.question}</TableCell>
                  <TableCell>{evalData.response1}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <span className="text-primary">{evalData.correctness1}/10</span>
                      <span className="text-blue-600">{evalData.faithfulness1}/10</span>
                    </div>
                  </TableCell>
                  <TableCell>{evalData.response2}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <span className="text-primary">{evalData.correctness2}/10</span>
                      <span className="text-blue-600">{evalData.faithfulness2}/10</span>
                    </div>
                  </TableCell>
                  <TableCell>{evalData.category}</TableCell>
                  <TableCell>{evalData.difficulty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <p className="text-center p-4">Loading evaluations...</p>}
        </CardContent>
      </Card>

    </div>
      
    
  );
}