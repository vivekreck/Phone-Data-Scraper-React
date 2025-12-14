import React, { useState } from 'react';
import { Download, Loader2, CheckCircle2, XCircle, Phone } from 'lucide-react';

export default function PhoneScraperApp() {
  const [apiKey, setApiKey] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [rangeSize, setRangeSize] = useState(600);
  const [minAge, setMinAge] = useState(78);
  const [maxAge, setMaxAge] = useState(96);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    setProgress({ processed: 0, total: 0 });
    setResults(null);

    const phoneList = phoneNumbers
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (phoneList.length === 0) {
      setError('Please enter at least one phone number');
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              setProgress({
                processed: data.processed,
                total: data.total,
                ageRangeCount: data.ageRangeCount,
                otherAgesCount: data.otherAgesCount,
                failedCount: data.failedCount,
              });
            } else if (data.type === 'complete') {
              setResults(data.results);
              setIsProcessing(false);
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

    if (filename.includes('failed')) {
      const headers = 'Number,StatusCode,Reason\n';
      const rows = data.map(row => `"${row.Number}","${row.StatusCode}","${row.Reason}"`).join('\n');
      csvContent = headers + rows;
    } else {
      const headers = 'Name,Number,Age\n';
      const rows = data.map(row => `"${row.Name}","${row.Number}",${row.Age}`).join('\n');
      csvContent = headers + rows;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ScraperAPI Key *
              </label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Numbers (one per line) *
              </label>
              <textarea
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="7609993322&#10;5615827060&#10;9032451149"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                required
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter base phone numbers without dashes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Range Size
                </label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Min Age
                </label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Age
                </label>
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
                'Start Scraping'
              )}
            </button>
          </form>

          {isProcessing && progress.total > 0 && (
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Progress</span>
                  <span>{progress.processed} / {progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {progress.ageRangeCount || 0}
                  </div>
                  <div className="text-xs text-gray-600">Target Age</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {progress.otherAgesCount || 0}
                  </div>
                  <div className="text-xs text-gray-600">Other Ages</div>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">
                    {progress.failedCount || 0}
                  </div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>
            </div>
          )}

          {results && (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">Results Ready!</h2>
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
                    onClick={() => downloadCSV(results.otherAges, 'other-ages.csv')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200"
                  >
                    <Download className="w-5 h-5" />
                    Download Other Ages ({results.otherAges.length} records)
                  </button>
                )}

                {results.failed.length > 0 && (
                  <button
                    onClick={() => downloadCSV(results.failed, 'failed-requests.csv')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200"
                  >
                    <Download className="w-5 h-5" />
                    Download Failed Requests ({results.failed.length} records)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>💡 Tip: The scraper will process {rangeSize} consecutive numbers for each base phone number</p>
        </div>
      </div>
    </div>
  );
}
