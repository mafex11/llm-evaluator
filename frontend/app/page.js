"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { EvaluationTable } from "@/components/EvaluationTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadCloud, Zap, FileText, LayoutDashboard, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const Home = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [dataset, setDataset] = useState([]);
  const [results, setResults] = useState([]);
  const [showChart, setShowChart] = useState(false); 


  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const res = await axios.get("http://localhost:5000/dataset");
        setDataset(res.data);
      } catch (err) {
        console.error("Error fetching dataset:", err);
      }
    };

    fetchDataset();
    const interval = setInterval(fetchDataset, 1000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get("http://localhost:5000/results");
        setResults(res.data);
      } catch (err) {
        console.error("Error fetching results:", err);
      }
    };

    fetchResults();
    const interval = setInterval(fetchResults, 1000);
    return () => clearInterval(interval);
  }, []);

  
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];

      
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Only CSV files are allowed.");
        setFile(null);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Please upload a file under 5MB.");
        setFile(null);
        return;
      }

      setFile(file);
      toast.success(`Selected file: ${file.name}`); 
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] }, 
    multiple: false,
  });

 
  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a valid CSV file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);

      const response = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("File uploaded successfully! Now you can evaluate."); 
      console.log(response.data);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };


  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      toast.info("⚡ Evaluation started...");

      await axios.post("http://localhost:5000/evaluate");
      toast.success("Evaluation completed! Fetching results...");
    } catch (error) {
      console.error("Evaluation failed:", error);
      toast.error("Evaluation failed. Check console for details.");
    } finally {
      setEvaluating(false);
    }
  };


  const chartData = results.map((result, index) => ({
    question: `Q${index + 1}`,
    deepseek: result.correctness1,
    qwen: result.correctness2,
  }));

  const chartData2 = results.map((result, index) => ({
    question: `Q${index + 1}`,
    deepseek: result.faithfulness1,
    qwen: result.faithfulness2,
  }));

  const { setTheme } = useTheme()


  return (
    <div className="min-h-screen bg-muted/40 relative overflow-hidden">
      

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#hsl(var(--primary))/0.03_1px,transparent_1px)] bg-[size:40px_40px] opacity-15 -z-10" />
      
      <div className="max-w-7xl mx-auto px-4 py-8 relative">
      
        <div className="flex items-center gap-3 mb-8 group">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:border-primary/30 transition-colors">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            LLM Evaluation Dashboard
          </h1>
                <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Upload Section with glass effect */}
        <Card className="mb-8 backdrop-blur-sm bg-background/80 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="h-6 w-6 text-primary" />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Upload Evaluation Dataset
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 w-full md:w-96 text-center cursor-pointer transition-all",
                  isDragActive 
                    ? "border-primary bg-primary/10 shadow-lg" 
                    : "border-muted-foreground/30 hover:border-primary/40 hover:bg-muted/20"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <UploadCloud className="h-12 w-12 text-muted-foreground" />
                  <div className="space-y-1">
                    {isDragActive ? (
                      <p className="text-primary font-medium animate-pulse">
                        Drop to upload CSV
                      </p>
                    ) : (
                      <>
                        <p className="font-medium text-foreground/90">
                          Drag & drop CSV file
                        </p>
                        <p className="text-sm text-muted-foreground/80">
                          or click to browse
                        </p>
                      </>
                    )}
                  </div>
                  {file && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-primary animate-in fade-in">
                      <FileText className="h-4 w-4" />
                      <span>{file.name}</span>
                    </div>
                  )}
                </div>
              </div>

              
              <div className="flex flex-col gap-4 w-full md:w-auto">
                <Button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  // variant="primary"
                  className="gap-2 transition-transform hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">↻</span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 " />
                      Upload File
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleEvaluate}
                  disabled={evaluating || loading}
                  className="gap-2 hover:border-primary/50 hover:text-primary/90 hover:-translate-y-0.5 transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  {evaluating ? "Evaluating..." : "Run Evaluation"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        
        <Tabs defaultValue="dataset" className="space-y-6">
          <TabsList className="bg-background/80 backdrop-blur-sm border border-border/50">
            <TabsTrigger 
              value="dataset" 
              className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:border data-[state=active]:border-primary/20"
            >
              <Table2 className="h-4 w-4" />
              Dataset
              <Badge variant="secondary" className="ml-1">
                {dataset.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="results" 
              className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:border data-[state=active]:border-primary/20"
            >
              <LayoutDashboard className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          
          <TabsContent value="dataset">
            <Card className="backdrop-blur-sm bg-background/80 border-border/50">
              <CardHeader>
                <CardTitle className="text-foreground/90">
                  Evaluation Dataset Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dataset.length > 0 ? (
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table className="border-collapse">
                      <TableHeader className="bg-muted/10">
                        <TableRow>
                          {["Question", "Possible Answers", "Reference Answer", "Category", "Difficulty"].map((header) => (
                            <TableHead key={header} className="py-3 font-medium text-foreground/80">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dataset.map((entry, index) => (
                          <TableRow 
                            key={index}
                            className="hover:bg-muted/5 transition-colors border-t border-border/20"
                          >
                            <TableCell className="font-medium max-w-[300px] truncate py-2">
                              {entry.question}
                            </TableCell>
                            <TableCell className="py-2">
                              {entry.possible_answers?.join(", ")}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate py-2">
                              {entry.reference_answer}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge 
                                variant="outline" 
                                className="bg-primary/10 text-primary/80 border-primary/20"
                              >
                                {entry.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge 
                                variant="outline" 
                                className="bg-muted/10 text-foreground/70 border-border/30"
                              >
                                {entry.difficulty}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-12 text-muted-foreground/80">
                    <FileText className="h-12 w-12 animate-pulse" />
                    <p>No dataset available. Upload a CSV file to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card className="backdrop-blur-sm bg-background/80 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground/90">
                    Evaluation Results
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="chart-toggle" className="text-foreground/80">
                      Show Metrics
                    </Label>
                    <Switch
                      id="chart-toggle"
                      checked={showChart}
                      onCheckedChange={setShowChart}
                      className="data-[state=checked]:bg-primary/80"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showChart && (
                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {[chartData, chartData2].map((data, idx) => (
                      <Card 
                        key={idx} 
                        className="bg-background/90 border-border/30 shadow-sm"
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-foreground/80">
                            {idx === 0 ? "Correctness Comparison" : "Faithfulness Comparison"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                              <XAxis 
                                dataKey="question" 
                                stroke="hsl(var(--foreground)/40)" 
                                fontSize={12}
                              />
                              <YAxis 
                                stroke="hsl(var(--foreground)/40)" 
                                fontSize={12}
                              />
                              <Tooltip 
                                contentStyle={{
                                  background: "hsl(var(--background))",
                                  borderColor: "hsl(var(--border))",
                                  borderRadius: 8,
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                                }}
                              />
                              <Bar 
                                dataKey="deepseek" 
                                fill="hsl(var(--primary))" 
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar 
                                dataKey="qwen" 
                                fill="hsl(var(--primary)/0.6)" 
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <EvaluationTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};


export default Home;
