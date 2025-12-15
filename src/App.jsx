import React, { useState, useRef } from "react";
import { Download, Loader2, CheckCircle2, XCircle, Phone, TrendingUp, AlertTriangle } from "lucide-react";

export default function PhoneScraperApp() {
  const [apiKey, setApiKey] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [rangeSize, setRangeSize] = useState(600);
  const [minAge, setMinAge] = useState(78);
  const [maxAge, setMaxAge] = useState(96);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, rateLimitHits: 0 });
  const [results, setResults] = useState({
    ageRange: [],
    otherAges: [],
    failed: [],
  });
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  // Use refs to accumulate data without causing re-renders on every update
  const accumulatedResults = useRef({
    ageRange: [],
    otherAges: [],
    failed: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsProcessing(true);
    setIsComplete(false);
    setProgress({ processed: 0, total: 0, rateLimitHits: 0 });
    setResults({ ageRange: [], otherAges: [], failed: [] });

    // Reset accumulated results
    accumulatedResults.current = {
      ageRange: [],
      otherAges: [],
      failed: [],
    };

    const phoneList = phoneNumbers
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (phoneList.length === 0) {
      setError("Please enter at least one phone number");
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch("https://phone-data-scraper.vercel.app/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          phoneNumbers: phoneList,
          rangeSize,
          minAge,
          maxAge,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "batch") {
                // Accumulate batch data
                accumulatedResults.current.ageRange.push(...data.data.ageRange);
                accumulatedResults.current.otherAges.push(...data.data.otherAges);
                accumulatedResults.current.failed.push(...data.data.failed);

                // Update progress
                setProgress({
                  processed: data.progress.processed,
                  total: data.progress.total,
                  rateLimitHits: data.progress.rateLimitHits || 0,
                });

                // Update displayed results (create new objects to trigger re-render)
                setResults({
                  ageRange: [...accumulatedResults.current.ageRange],
                  otherAges: [...accumulatedResults.current.otherAges],
                  failed: [...accumulatedResults.current.failed],
                });
              } else if (data.type === "complete") {
                setIsProcessing(false);
                setIsComplete(true);
                console.log("Scraping completed:", data.processed, "records processed");
                if (data.rateLimitHits > 0) {
                  console.log("Rate limit hits:", data.rateLimitHits);
                }
              } else if (data.type === "error") {
                setError(`Server error: ${data.message}`);
                setIsProcessing(false);
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const downloadCSV = (data, filename) => {
    let csvContent;

    if (filename.includes("failed")) {
      const headers = "Number,StatusCode,Reason\n";
      const rows = data.map((row) => `"${row.Number}","${row.StatusCode}","${row.Reason}"`).join("\n");
      csvContent = headers + rows;
    } else {
      const headers = "Name,Number,Age\n";
      const rows = data.map((row) => `"${row.Name}","${row.Number}",${row.Age}`).join("\n");
      csvContent = headers + rows;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const progressPercent = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <Phone className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Phone Data Scraper</h1>
          </div>

          {/* Rate Limit Warning */}
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Rate Limit Protection Active</p>
                <p>Processing 5 requests per batch with 1.5s delays to avoid API limits. Auto-retry on 429 errors.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ScraperAPI Key *</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your ScraperAPI key"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Numbers (one per line) *</label>
              <textarea
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="7609993322&#10;5615827060&#10;9032451149"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                required
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">Enter base phone numbers without dashes</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Range Size</label>
                <input
                  type="number"
                  value={rangeSize}
                  onChange={(e) => setRangeSize(parseInt(e.target.value))}
                  min="1"
                  max="1000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Min Age</label>
                <input
                  type="number"
                  value={minAge}
                  onChange={(e) => setMinAge(parseInt(e.target.value))}
                  min="0"
                  max="120"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Max Age</label>
                <input
                  type="number"
                  value={maxAge}
                  onChange={(e) => setMaxAge(parseInt(e.target.value))}
                  min="0"
                  max="120"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Start Scraping"
              )}
            </button>
          </form>

          {(isProcessing || isComplete) && progress.total > 0 && (
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    {isComplete ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Complete!</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        <span>Progress</span>
                      </>
                    )}
                  </span>
                  <span>
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                {/* Rate limit indicator */}
                {progress.rateLimitHits > 0 && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{progress.rateLimitHits} rate limit hits (auto-retried)</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white rounded-lg p-3 border-2 border-green-200">
                  <div className="text-2xl font-bold text-green-600">{results.ageRange.length}</div>
                  <div className="text-xs text-gray-600">Target Age</div>
                </div>
                <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{results.otherAges.length}</div>
                  <div className="text-xs text-gray-600">Other Ages</div>
                </div>
                <div className="bg-white rounded-lg p-3 border-2 border-red-200">
                  <div className="text-2xl font-bold text-red-600">{results.failed.length}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>

              {/* Show sample of latest data */}
              {results.ageRange.length > 0 && (
                <div className="mt-4 bg-white rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Latest Target Age Matches:</h3>
                  <div className="space-y-1 text-xs font-mono text-gray-600 max-h-32 overflow-y-auto">
                    {results.ageRange
                      .slice(-5)
                      .reverse()
                      .map((record, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate max-w-[150px]">{record.Name}</span>
                          <span>{record.Number}</span>
                          <span className="font-bold text-green-600">{record.Age}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(results.ageRange.length > 0 || results.otherAges.length > 0 || results.failed.length > 0) && (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">
                  {isComplete ? "Download Results" : "Download Current Data"}
                </h2>
              </div>

              <div className="space-y-3">
                {results.ageRange.length > 0 && (
                  <button
                    onClick={() => downloadCSV(results.ageRange, `age-${minAge}-to-${maxAge}.csv`)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200"
                  >
                    <Download className="w-5 h-5" />
                    Download Age {minAge}-{maxAge} ({results.ageRange.length} records)
                  </button>
                )}

                {results.otherAges.length > 0 && (
                  <button
                    onClick={() => downloadCSV(results.otherAges, "other-ages.csv")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200"
                  >
                    <Download className="w-5 h-5" />
                    Download Other Ages ({results.otherAges.length} records)
                  </button>
                )}

                {results.failed.length > 0 && (
                  <button
                    onClick={() => downloadCSV(results.failed, "failed-requests.csv")}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200"
                  >
                    <Download className="w-5 h-5" />
                    Download Failed Requests ({results.failed.length} records)
                  </button>
                )}
              </div>

              {!isComplete && (
                <p className="text-xs text-gray-600 mt-3 text-center">
                  💡 You can download data while processing continues
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600 space-y-1">
          <p>💡 Processing with intelligent rate limiting (5 per batch, 1.5s delays)</p>
          <p>🔄 Auto-retry up to 3 times with exponential backoff on rate limits</p>
        </div>
      </div>
    </div>
  );
}
