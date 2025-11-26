// import { readFileSync, writeFileSync } from 'fs';
const { readFileSync, writeFileSync } = require('fs');

function filterAndSaveConduitApiEntries(inputFilename, outputFilename) {
  try {
    // Read and parse the file
    const fileContent = readFileSync(inputFilename, 'utf8');
    const harObject = JSON.parse(fileContent);
    
   // Filter entries and clean up unwanted properties in one step
    harObject.log.entries = harObject.log.entries
      .filter(entry => {
        const url = entry.request.url;
        return url.includes('conduit-api') && !url.toLowerCase().endsWith('.jpeg');
      })
      .map(entry => {
        // Clean up request object
        if (entry.request) {
          entry.request.headers = [];
          delete entry.request.cookies;
          delete entry.request.httpVersion;
          delete entry.request.headersSize;
          delete entry.request.bodySize;
        }
        
        // Clean up response object
        if (entry.response) {
          entry.response.headers = [];
          delete entry.response.cookies;
          delete entry.response.httpVersion;
          delete entry.response.statusText;
          delete entry.response.headersSize;
          delete entry.response.bodySize;
          delete entry.response.redirectURL;
        }
        
        // Remove top-level properties
        delete entry.cache;
        delete entry.timings;
        
        return entry;
      });
    
    // Write the filtered HAR to file
    const jsonString = JSON.stringify(harObject, null, 2);
    writeFileSync(outputFilename, jsonString, 'utf8');
    
    console.log(`Filtered HAR saved to: ${outputFilename}`);
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

filterAndSaveConduitApiEntries('networking.har', 'filtered-har.json');