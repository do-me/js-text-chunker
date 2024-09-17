class TextSplitter {
    constructor({
      chunkSize = 4000,
      lengthFunction = (text) => text.length,
      keepSeparator = false,
    } = {}) {
      this.chunkSize = chunkSize;
      this.lengthFunction = lengthFunction;
      this.keepSeparator = keepSeparator;
    }
  
    splitText(text) {
      throw new Error("Method 'splitText' should be implemented.");
    }
  
    _joinDocs(docs, separator) {
      return docs.join(separator).trim() || null;
    }
  
    _mergeSplits(splits, separator) {
      let docs = [], currentDoc = [], total = 0;
      const separatorLen = this.lengthFunction(separator);
  
      splits.forEach(d => {
        const len = this.lengthFunction(d);
        if (total + len + (currentDoc.length ? separatorLen : 0) > this.chunkSize) {
          docs.push(this._joinDocs(currentDoc, separator));
          currentDoc = [];
          total = 0;
        }
        currentDoc.push(d);
        total += len + (currentDoc.length > 1 ? separatorLen : 0);
      });
  
      const finalDoc = this._joinDocs(currentDoc, separator);
      if (finalDoc) docs.push(finalDoc);
      return docs;
    }
  }
  
  const splitTextWithRegex = (text, separator, keepSeparator) => {
    const splits = separator 
      ? text.split(new RegExp(keepSeparator ? `(${separator})` : separator))
      : [...text];
    
    return splits.filter(Boolean);
  };
  
  class RecursiveCharacterTextSplitter extends TextSplitter {
    constructor({
      separators = ["\n\n", "\n", " ", ""],
      keepSeparator = true,
      isSeparatorRegex = false,
      ...rest
    } = {}) {
      super({ keepSeparator, ...rest });
      this.separators = separators;
      this.isSeparatorRegex = isSeparatorRegex;
    }
  
    _splitText(text, separators) {
      let finalChunks = [], goodSplits = [];
      const separator = this._getSeparator(text, separators);
      const finalSeparator = this.keepSeparator ? "" : separator;
      const splits = splitTextWithRegex(text, this._escapeRegex(separator), this.keepSeparator);
      const newSeparators = separators.slice(separators.indexOf(separator) + 1);
  
      splits.forEach(s => {
        if (this.lengthFunction(s) < this.chunkSize) {
          goodSplits.push(s);
        } else {
          if (goodSplits.length) {
            finalChunks.push(...this._mergeSplits(goodSplits, finalSeparator));
            goodSplits = [];
          }
          finalChunks.push(...(newSeparators.length ? this._splitText(s, newSeparators) : [s]));
        }
      });
  
      if (goodSplits.length) finalChunks.push(...this._mergeSplits(goodSplits, finalSeparator));
      return finalChunks;
    }
  
    _getSeparator(text, separators) {
      for (const sep of separators) {
        const escapedSep = this.isSeparatorRegex ? sep : this._escapeRegex(sep);
        if (new RegExp(escapedSep).test(text)) return sep;
      }
      return separators[separators.length - 1];
    }
  
    _escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  
    splitText(text) {
      return this._splitText(text, this.separators);
    }
  }
  
  ///////////////////////
  //////////////////////////
  // Example usage
  document.getElementById('chunkButton').addEventListener('click', () => {
    const text = document.getElementById('textInput').value;
    const chunkSize = document.getElementById("chunkSize").value;
  
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      separators: ["\n\n", "\n", ". ", " ", ""],
      keepSeparator: false,
    });
  
    const chunks = splitter.splitText(text);
    appendChunksToTable(chunks);
    enableExportButton(chunks);
    console.log("Number of chunks:", chunks.length);
    chunks.forEach((c, i) => console.log("Index:", i, "Length:", c.length, c));
  });
  
  function appendChunksToTable(chunks) {
    const tableBody = document.getElementById('chunkTableBody');
    tableBody.innerHTML = ''; // Clear table
  
    chunks.forEach((chunk, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${index}</td><td>${chunk.length}</td><td>${chunk}</td>`;
      tableBody.appendChild(row);
    });
  }
  
  // Enable export button and add CSV export functionality
  function enableExportButton(chunks) {
    const exportButton = document.getElementById('exportButton');
    exportButton.disabled = false; // Enable the button
  
    // Add event listener for export button to export chunks as CSV
    exportButton.addEventListener('click', () => exportChunksAsCSV(chunks));
  }
  
  // Export chunks as CSV file
  function exportChunksAsCSV(chunks) {
    let csvContent = "Index,Chunk Length,Chunk Text\n";
  
    chunks.forEach((chunk, index) => {
      csvContent += `${index},${chunk.length},"${chunk.replace(/"/g, '""')}"\n`; // Handle quotes in chunk text
    });
  
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chunks.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  