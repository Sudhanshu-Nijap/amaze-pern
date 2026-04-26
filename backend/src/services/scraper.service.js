const { execFile } = require("child_process");
const path = require("path");

const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python";
const SCRAPER_DIR = path.join(__dirname, "../../python_scraper");

function runPythonScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRAPER_DIR, scriptName);
    
    execFile(PYTHON_EXECUTABLE, [scriptPath, ...args], { cwd: SCRAPER_DIR }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${scriptName}:`, stderr);
        return reject(error);
      }
      
      try {
        const jsonOutput = JSON.parse(stdout);
        resolve(jsonOutput);
      } catch (parseError) {
        console.error("Failed to parse python output:", stdout);
        reject(new Error("Invalid JSON output from python script"));
      }
    });
  });
}

const scrapeProduct = async (url) => {
  return await runPythonScript("cli_scraper.py", [url]);
};

const getBestsellers = async (start = 0, count = 8) => {
  return await runPythonScript("bestseller.py", [start.toString(), count.toString()]);
};

const getTodayDeals = async (start = 0, count = 8) => {
  return await runPythonScript("today_deals.py", [start.toString(), count.toString()]);
};

module.exports = {
  scrapeProduct,
  getBestsellers,
  getTodayDeals
};
